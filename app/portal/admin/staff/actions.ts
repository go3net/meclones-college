"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

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

  revalidatePath("/portal/admin/staff");
  redirect(`/portal/admin/staff?reset=${encodeURIComponent(target.name)}`);
}

export async function toggleUserActive(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";
  if (!userId) throw new Error("userId required");
  await prisma.user.update({ where: { id: userId }, data: { isActive: active } });
  revalidatePath("/portal/admin/staff");
}
