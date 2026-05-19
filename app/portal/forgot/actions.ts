"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

const Schema = z.object({ email: z.string().email() });

/**
 * Always returns the same "If an account exists, we sent a link" message —
 * never leak whether an email is registered. We only actually send if a
 * matching active user exists, but the user-facing response is identical.
 */
export async function requestPasswordReset(formData: FormData) {
  const parsed = Schema.safeParse({ email: String(formData.get("email") ?? "").trim() });
  if (!parsed.success) {
    redirect(`/portal/forgot?error=${encodeURIComponent("Please enter a valid email address")}`);
  }
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, isActive: true } });

  if (user && user.isActive) {
    const rawToken = await createResetToken(email);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website;
    const resetUrl = `${siteUrl.replace(/\/$/, "")}/portal/reset-password/${rawToken}`;
    try {
      await sendPasswordResetEmail({ to: email, name: user.name, resetUrl });
    } catch (err) {
      console.error("[forgot] email send failed", err);
    }
  }

  // Same response regardless of whether the email is on file.
  redirect("/portal/forgot?sent=1");
}
