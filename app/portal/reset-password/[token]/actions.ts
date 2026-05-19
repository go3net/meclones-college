"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeResetToken } from "@/lib/password-reset";

const Schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string().min(8),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

export async function resetPasswordWithToken(formData: FormData) {
  const parsed = Schema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/reset-password/${formData.get("token")}?error=${encodeURIComponent(msg)}`);
  }

  const email = await consumeResetToken(parsed.data.token);
  if (!email) {
    redirect(`/portal/forgot?error=${encodeURIComponent("Reset link is invalid or expired. Request a new one.")}`);
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  redirect("/portal/login?reset=1");
}
