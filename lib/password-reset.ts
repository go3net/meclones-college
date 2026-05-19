import crypto from "node:crypto";
import { prisma } from "./prisma";

/** SHA-256 a raw token for safe storage. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Generate a URL-safe one-time token (32 bytes → 64 hex chars). */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create and persist a reset token for an email. Returns the raw token —
 * the caller embeds it in the email link. The DB only ever stores the hash.
 *
 * Tokens expire 1 hour after creation. Older unused tokens for the same
 * email are invalidated so only the latest link works.
 */
export async function createResetToken(email: string) {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.updateMany({
    where: { email: email.toLowerCase(), usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { email: email.toLowerCase(), tokenHash, expiresAt },
  });

  return raw;
}

/**
 * Validate a raw token. Returns the matched email, or null if the token
 * is invalid / expired / already used.
 */
export async function consumeResetToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt < new Date()) return null;

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row.email;
}
