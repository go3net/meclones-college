/**
 * Two-factor (TOTP) helpers wrapping otplib + qrcode. Standard 30s window,
 * 6 digits, base32-encoded shared secret — compatible with Google
 * Authenticator, Authy, 1Password, Microsoft Authenticator, etc.
 */

import { authenticator } from "otplib";
import { toDataURL as qrToDataUrl } from "qrcode";
import { randomBytes, createHash } from "node:crypto";
import { SCHOOL } from "./constants";
import { prisma } from "./prisma";

const ISSUER = SCHOOL.shortName;

// Use a 1-step window on either side so a code that ticks over mid-submit
// still verifies. The default in otplib is 0; we relax to 1. Bind options
// lazily on first use — top-level mutation breaks Next.js bundling during
// page-data collection because the singleton may not be fully wired yet.
let configured = false;
function getAuth() {
  if (!configured) {
    authenticator.options = { window: 1, step: 30 };
    configured = true;
  }
  return authenticator;
}

/** Generate a fresh base32 secret for a new user. */
export function generateTotpSecret(): string {
  return getAuth().generateSecret();
}

/**
 * Build the otpauth:// URL that authenticator apps consume via QR code.
 * Uses the user's email as the account label so multiple staff accounts
 * are distinguishable inside the authenticator app.
 */
export function buildOtpauthUrl(secret: string, accountLabel: string): string {
  return getAuth().keyuri(accountLabel, ISSUER, secret);
}

/** Render the otpauth URL as a base64 data URL <img src can use. */
export async function totpQrDataUrl(secret: string, accountLabel: string): Promise<string> {
  const url = buildOtpauthUrl(secret, accountLabel);
  return qrToDataUrl(url, { margin: 1, width: 220 });
}

/** Verify a 6-digit code against a secret. Returns true on match. */
export function verifyTotpCode(secret: string, code: string): boolean {
  const clean = code.replace(/\D/g, "").slice(0, 6);
  if (clean.length !== 6) return false;
  try {
    return getAuth().verify({ token: clean, secret });
  } catch {
    return false;
  }
}

// ─── Recovery codes ──────────────────────────────────────────────────

/** How many recovery codes to issue per regeneration. */
export const RECOVERY_CODE_COUNT = 10;

function hashRecoveryCode(raw: string): string {
  // Normalise on the hashed value so user-typed casing / dashes don't matter.
  const normal = raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return createHash("sha256").update(normal).digest("hex");
}

/**
 * Build a printable recovery code. 10 chars, lowercase a–z + 2–9 (no
 * 0/1/o/l to keep them readable in print). Format: `xxxxx-xxxxx`.
 */
function generateRawRecoveryCode(): string {
  const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no 0/1/o/l
  const bytes = randomBytes(10);
  let raw = "";
  for (const b of bytes) raw += ALPHABET[b % ALPHABET.length];
  return raw.slice(0, 5) + "-" + raw.slice(5, 10);
}

/**
 * Replace every existing recovery code for the user with a fresh batch.
 * Returns the raw codes — these are shown to the user exactly once.
 */
export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const raws: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) raws.push(generateRawRecoveryCode());

  // Wipe and re-create atomically so we never end up with a half-rotated set.
  await prisma.$transaction([
    prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    prisma.twoFactorRecoveryCode.createMany({
      data: raws.map(raw => ({ userId, codeHash: hashRecoveryCode(raw) })),
    }),
  ]);

  return raws;
}

/**
 * Validate a user-typed recovery code. Returns true (and marks the code
 * used) on a hit; false otherwise. Already-used codes never match.
 */
export async function consumeRecoveryCode(userId: string, raw: string): Promise<boolean> {
  const hash = hashRecoveryCode(raw);
  const row = await prisma.twoFactorRecoveryCode.findUnique({ where: { codeHash: hash } });
  if (!row || row.userId !== userId || row.usedAt) return false;

  await prisma.twoFactorRecoveryCode.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return true;
}

/** Count how many recovery codes the user has left. */
export async function unusedRecoveryCodeCount(userId: string): Promise<number> {
  return prisma.twoFactorRecoveryCode.count({ where: { userId, usedAt: null } });
}

/** Delete every recovery code for the user (called on 2FA disable). */
export async function clearRecoveryCodes(userId: string) {
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } });
}
