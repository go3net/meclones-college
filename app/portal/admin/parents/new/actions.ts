"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createResetToken } from "@/lib/password-reset";
import { sendWelcomeEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

const Schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).optional().or(z.literal("")),
  studentIds: z.union([z.string(), z.array(z.string())]).optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
  whatsappOptIn: z.coerce.boolean().optional(),
});

export async function createParent(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  // Allow multi-select for students via repeated `studentIds` fields.
  const studentIds = formData.getAll("studentIds").map(v => String(v)).filter(Boolean);

  const parsed = Schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    studentIds,
    password: formData.get("password") || undefined,
    whatsappOptIn: formData.get("whatsappOptIn") === "on",
  });

  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/admin/parents/new?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: d.email } });
  if (exists) {
    redirect(`/portal/admin/parents/new?error=${encodeURIComponent("A user with that email already exists.")}`);
  }

  const passwordHash = await bcrypt.hash(d.password || "Meclones123!", 10);

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      role: "PARENT",
      passwordHash,
      isActive: true,
      image: d.photoUrl || null,
    },
  });

  const parent = await prisma.parent.create({
    data: { userId: user.id, whatsappOptIn: !!d.whatsappOptIn },
  });

  // Link to selected students.
  for (const sid of studentIds) {
    await prisma.parentStudent.create({
      data: { parentId: parent.id, studentId: sid, relation: "Parent" },
    });
  }

  // Welcome email with "Set your password" link (7-day TTL).
  try {
    const token = await createResetToken(d.email, { ttlHours: 24 * 7 });
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
    const linkedChildren = studentIds.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: studentIds } },
          include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
        })
      : [];
    await sendWelcomeEmail({
      to: d.email,
      recipientName: d.name,
      role: "PARENT",
      loginEmail: d.email,
      setPasswordUrl: `${siteUrl}/portal/reset-password/${token}`,
      loginUrl: `${siteUrl}/portal/login`,
      children: linkedChildren.map(c => ({
        name: c.user.name,
        admissionNumber: c.admissionNumber,
        className: c.classRef ? `${c.classRef.name}${c.classRef.arm}` : "—",
      })),
    });
  } catch (err) {
    console.error("[parents] welcome email failed", err);
  }

  revalidatePath("/portal/admin/parents");
  redirect(`/portal/admin/parents?added=${encodeURIComponent(d.name)}`);
}
