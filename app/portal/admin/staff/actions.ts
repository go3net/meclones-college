"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { createResetToken } from "@/lib/password-reset";
import { sendWelcomeEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

const ResetSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Reset any user's password. Restricted to SUPER_ADMIN + DIRECTOR + ADMIN.
 * Admins cannot reset another admin's password (only super-admin/director can).
 */
export async function resetUserPassword(formData: FormData) {
  const acting = await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = ResetSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/staff?error=${encodeURIComponent(msg)}`);
  }

  const target = await prisma.user.findUnique({ where: { id: parsed.data.userId }, select: { id: true, role: true, name: true } });
  if (!target) redirect(`/portal/admin/staff?error=${encodeURIComponent("User not found")}`);

  // Privilege rule: a plain ADMIN can't reset another admin's password.
  if (
    acting.role === "ADMIN" &&
    ["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(target.role)
  ) {
    redirect(`/portal/admin/staff?error=${encodeURIComponent("Only the director or super-admin can reset a staff password.")}`);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });

  auditLog({
    action: "user.password_reset",
    targetType: "User",
    targetId: target.id,
    metadata: { targetRole: target.role, targetName: target.name },
  });

  revalidatePath("/portal/admin/staff");
  redirect(`/portal/admin/staff?reset=${encodeURIComponent(target.name)}`);
}

const CreateStaffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().max(40).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "ACCOUNTANT", "DIRECTOR"]),
});

/**
 * Create a new staff (ADMIN / ACCOUNTANT / DIRECTOR) account and email
 * them a welcome / set-password link. Restricted to DIRECTOR + SUPER_ADMIN
 * — plain ADMIN cannot create staff (preserves the privilege rule that
 * a basic admin can't elevate themselves or peers).
 */
export async function createStaffUser(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const parsed = CreateStaffSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    role: String(formData.get("role") ?? "").trim(),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/admin/staff?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (existing) {
    redirect(`/portal/admin/staff?error=${encodeURIComponent("A user with that email already exists.")}`);
  }

  // Random initial password — the user sets their real one via the welcome
  // link. The default is intentionally unguessable in case the welcome
  // email is delayed and they try to log in before clicking.
  const tempBytes = (await import("node:crypto")).randomBytes(16).toString("base64url");
  const passwordHash = await bcrypt.hash(tempBytes, 10);

  const created = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      phone: d.phone || null,
      role: d.role as "ADMIN" | "ACCOUNTANT" | "DIRECTOR",
      passwordHash,
      isActive: true,
    },
  });

  auditLog({
    action: "user.create_staff",
    targetType: "User",
    targetId: created.id,
    metadata: { targetRole: d.role, targetName: d.name },
  });

  // Send welcome email with set-password link (7-day TTL).
  try {
    const token = await createResetToken(d.email, { ttlHours: 24 * 7 });
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
    await sendWelcomeEmail({
      to: d.email,
      recipientName: d.name,
      role: "STAFF",
      loginEmail: d.email,
      setPasswordUrl: `${siteUrl}/portal/reset-password/${token}`,
      loginUrl: `${siteUrl}/portal/login`,
    });
  } catch (err) {
    console.error("[staff] welcome email failed", err);
  }

  revalidatePath("/portal/admin/staff");
  redirect(`/portal/admin/staff?added=${encodeURIComponent(d.name)}`);
}

/**
 * Re-issue the welcome / set-password email for a user — handy when the
 * first one bounced, got lost, or the user just never clicked through.
 * Same TTL as the original (7 days). Restricted to ADMIN+ (ADMIN can
 * resend for parents/teachers/students only; staff resends require
 * DIRECTOR or SUPER_ADMIN).
 */
export async function resendWelcomeEmail(formData: FormData) {
  const acting = await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect(`/portal/admin/staff?error=${encodeURIComponent("Missing userId")}`);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, parent: { select: { children: { include: { student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } } } } } } },
  });
  if (!target) redirect(`/portal/admin/staff?error=${encodeURIComponent("User not found")}`);

  // Privilege guard — same as resetUserPassword.
  if (
    acting.role === "ADMIN" &&
    ["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(target.role)
  ) {
    redirect(`/portal/admin/staff?error=${encodeURIComponent("Only the director or super-admin can resend a staff welcome.")}`);
  }

  // STUDENT users have an auto-generated "@meclones.local" email — pointless
  // to send welcome there. Skip with an informative error.
  if (target.role === "STUDENT" || target.email.endsWith("@meclones.local")) {
    redirect(`/portal/admin/staff?error=${encodeURIComponent("Students sign in with their admission # — no welcome email needed.")}`);
  }

  try {
    const token = await createResetToken(target.email, { ttlHours: 24 * 7 });
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
    const children = target.parent
      ? target.parent.children.map(c => ({
          name: c.student.user.name,
          admissionNumber: c.student.admissionNumber,
          className: c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "—",
        }))
      : undefined;
    await sendWelcomeEmail({
      to: target.email,
      recipientName: target.name,
      role: target.role === "PARENT" ? "PARENT" : target.role === "TEACHER" ? "TEACHER" : "STAFF",
      loginEmail: target.email,
      setPasswordUrl: `${siteUrl}/portal/reset-password/${token}`,
      loginUrl: `${siteUrl}/portal/login`,
      children,
    });
  } catch (err) {
    console.error("[staff] resend welcome failed", err);
    redirect(`/portal/admin/staff?error=${encodeURIComponent("Email failed to send. Check Resend logs.")}`);
  }

  auditLog({
    action: "user.resend_welcome",
    targetType: "User",
    targetId: target.id,
    metadata: { targetRole: target.role, targetName: target.name },
  });

  revalidatePath("/portal/admin/staff");
  redirect(`/portal/admin/staff?welcomed=${encodeURIComponent(target.name)}`);
}

export async function toggleUserActive(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";
  if (!userId) throw new Error("userId required");
  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });

  auditLog({
    action: active ? "user.activate" : "user.deactivate",
    targetType: "User",
    targetId: userId,
  });

  revalidatePath("/portal/admin/staff");
}
