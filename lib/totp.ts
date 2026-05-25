/**
 * Two-factor (TOTP) helpers wrapping otplib + qrcode. Standard 30s window,
 * 6 digits, base32-encoded shared secret — compatible with Google
 * Authenticator, Authy, 1Password, Microsoft Authenticator, etc.
 */

import { authenticator } from "otplib";
import { toDataURL as qrToDataUrl } from "qrcode";
import { SCHOOL } from "./constants";

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
