/**
 * Minimal Paystack REST client. No SDK — keeps the dependency tree small
 * and avoids edge-runtime issues. All amounts are in kobo (NGN × 100).
 */

import { SCHOOL } from "./constants";

const API_BASE = "https://api.paystack.co";

function key(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
}

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return Math.round(kobo) / 100;
}

interface InitParams {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  /** Optional Paystack subaccount to split the charge to (school's bank). */
  subaccount?: string;
}

export interface InitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/**
 * Initialize a transaction. Returns the hosted-page URL we redirect the
 * parent to. On success they bounce back to our callback URL.
 */
export async function initTransaction(p: InitParams): Promise<InitResult> {
  const res = await fetch(`${API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: p.email,
      amount: nairaToKobo(p.amountNaira),
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: {
        ...p.metadata,
        cancel_action: p.callbackUrl,
        custom_fields: [{
          display_name: "School",
          variable_name: "school_name",
          value: SCHOOL.name,
        }],
      },
      ...(p.subaccount ? { subaccount: p.subaccount } : {}),
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json?.status) {
    throw new Error(json?.message ?? `Paystack init failed (${res.status})`);
  }
  return json.data as InitResult;
}

export interface VerifyResult {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number; // kobo
  paid_at: string | null;
  channel: string | null;
  customer: { email: string };
  metadata: Record<string, unknown>;
}

/**
 * Verify a transaction by reference. Always call this server-side after
 * Paystack redirects the user back, *and* in the webhook handler — never
 * trust callback-only state.
 */
export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${key()}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json?.status) {
    throw new Error(json?.message ?? `Paystack verify failed (${res.status})`);
  }
  return json.data as VerifyResult;
}

/**
 * Generate a school-prefixed reference. Paystack requires uniqueness per
 * merchant, so namespacing by school + timestamp + random tail is safe.
 */
export function genReference(prefix = "MCL"): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${t}-${r}`.toUpperCase();
}
