"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { generateTotpSecret, verifyTotpCode, regenerateRecoveryCodes, clearRecoveryCodes } from "@/lib/totp";
import { cookies } from "next/headers";

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

  // Issue a fresh batch of recovery codes and stash them in a short-lived
  // server cookie so the next render of /security can show them ONCE.
  // After that they're gone forever — the user has to regenerate to see new ones.
  const codes = await regenerateRecoveryCodes(user.id);
  cookies().set("2fa_codes_once", JSON.stringify(codes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 min — plenty of time to print/copy
    path: "/portal/me/security",
  });

  auditLog({
    action: "user.2fa_enabled",
    targetType: "User",
    targetId: user.id,
  });

  revalidatePath("/portal/me/security");
  redirect("/portal/me/security?saved=1&codes=fresh");
}

/**
 * Regenerate the user's recovery codes. Replaces any existing batch.
 * Requires the user's password — same gate as disable.
 */
export async function regenerateCodes(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  const password = String(formData.get("password") ?? "");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true, totpEnabledAt: true },
  });
  if (!dbUser?.totpEnabledAt) {
    redirect("/portal/me/security?error=" + encodeURIComponent("Enable 2FA first."));
  }
  if (!(await bcrypt.compare(password, dbUser!.passwordHash))) {
    redirect("/portal/me/security?error=" + encodeURIComponent("Wrong password."));
  }

  const codes = await regenerateRecoveryCodes(user.id);
  cookies().set("2fa_codes_once", JSON.stringify(codes), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/portal/me/security",
  });

  auditLog({
    action: "user.2fa_recovery_codes_regenerated",
    targetType: "User",
    targetId: user.id,
  });

  revalidatePath("/portal/me/security");
  redirect("/portal/me/security?codes=fresh");
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
  await clearRecoveryCodes(user.id);

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
