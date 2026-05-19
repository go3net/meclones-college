"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

const ProfileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal("")),
  image: z.string().optional().or(z.literal("")),
});

export async function updateOwnProfile(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const parsed = ProfileSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    image: String(formData.get("image") ?? "").trim() || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/me/profile?error=${encodeURIComponent(msg)}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      image: parsed.data.image || null,
    },
  });

  revalidatePath("/portal/me/profile");
  redirect("/portal/me/profile?updated=1");
}

const PasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Password confirmation does not match",
  path: ["confirmPassword"],
});

export async function changeOwnPassword(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const parsed = PasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/me/profile?passwordError=${encodeURIComponent(msg)}`);
  }

  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!u) redirect("/portal/login");

  const ok = await bcrypt.compare(parsed.data.currentPassword, u.passwordHash);
  if (!ok) {
    redirect(`/portal/me/profile?passwordError=${encodeURIComponent("Current password is incorrect")}`);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  redirect("/portal/me/profile?passwordChanged=1");
}
