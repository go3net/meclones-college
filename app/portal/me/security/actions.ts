"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { generateTotpSecret, verifyTotpCode } from "@/lib/totp";

/**
 * Step 1: start enrolment. Generates a fresh secret, stores it on the
 * User row but leaves totpEnabledAt null until the user confirms with a
 * working code. This way an interrupted enrolment doesn't lock anyone out.
 */
export async function startTotpEnrolment() {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabledAt: true } });
  if (dbUser?.totpEnabledAt) {
    redirect("/portal/me/security?error=" + encodeURIComponent("2FA is already enabled. Disable it first to re-enrol."));
  }

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret, totpEnabledAt: null },
  });

  revalidatePath("/portal/me/security");
  redirect("/portal/me/security?step=verify");
}

/**
 * Step 2: confirm enrolment. User scans the QR, types the current 6-digit
 * code, we verify and flip totpEnabledAt to now() on success.
 */
export async function confirmTotpEnrolment(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  const code = String(formData.get("code") ?? "").trim();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, totpEnabledAt: true },
  });
  if (!dbUser?.totpSecret) {
    redirect("/portal/me/security?error=" + encodeURIComponent("No enrolment in progress. Start over."));
  }
  if (dbUser!.totpEnabledAt) {
    redirect("/portal/me/security?saved=already-on");
  }
  if (!verifyTotpCode(dbUser!.totpSecret!, code)) {
    redirect("/portal/me/security?step=verify&error=" + encodeURIComponent("Wrong code. Check your authenticator and try again."));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabledAt: new Date() },
  });

  auditLog({
    action: "user.2fa_enabled",
    targetType: "User",
    targetId: user.id,
  });

  revalidatePath("/portal/me/security");
  redirect("/portal/me/security?saved=1");
}

/**
 * Disable 2FA. Requires the user's current password to prevent a session
 * theft from silently removing the second factor.
 */
export async function disableTotp(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  const password = String(formData.get("password") ?? "");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, totpEnabledAt: true },
  });
  if (!dbUser?.totpEnabledAt) {
    redirect("/portal/me/security?error=" + encodeURIComponent("2FA is not currently on."));
  }
  if (!(await bcrypt.compare(password, dbUser!.passwordHash))) {
    redirect("/portal/me/security?error=" + encodeURIComponent("Wrong password."));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabledAt: null },
  });

  auditLog({
    action: "user.2fa_disabled",
    targetType: "User",
    targetId: user.id,
  });

  revalidatePath("/portal/me/security");
  redirect("/portal/me/security?saved=off");
}

/** Cancel an in-progress enrolment (clears the half-set secret). */
export async function cancelTotpEnrolment() {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabledAt: null },
  });
  redirect("/portal/me/security");
}
