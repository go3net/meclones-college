import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prismaBase } from "@/lib/prisma";
import { applyPaymentSuccess } from "@/lib/apply-payment";
import { koboToNaira, paystackSecretKeyFor } from "@/lib/paystack";
import { loadSchoolById } from "@/lib/host";
import { getCurrentSchool } from "@/lib/tenant";
import { runAsSchool } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function signatureMatches(raw: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Paystack webhook. Configure this URL in the Paystack dashboard:
 *   https://<your-domain>/api/paystack/webhook
 *
 * Every school's Paystack account points at this one URL. The HMAC-SHA512
 * signature is checked against the key of the school that owns the
 * payment reference (its own stored key, else the platform key), so the
 * payload is parsed first but nothing is acted on until it verifies.
 * Successful charge events are idempotently applied to the matching Fee.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  let payload: { event?: string; data?: { reference?: string; status?: string; amount?: number; channel?: string | null; paid_at?: string | null } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Webhooks arrive with no user and (on the Railway URL) no meaningful
  // host, so the tenant comes from the payment reference itself.
  const reference = payload.data?.reference;
  const pending = reference
    ? await prismaBase.payment.findUnique({ where: { reference }, select: { feeId: true, schoolId: true } })
    : null;
  const school = pending?.schoolId ? await loadSchoolById(pending.schoolId) : await getCurrentSchool();

  let secret: string;
  try {
    secret = paystackSecretKeyFor(school);
  } catch {
    console.error("[paystack webhook] no Paystack secret key available");
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  }
  if (!signatureMatches(raw, signature, secret)) {
    console.warn("[paystack webhook] signature mismatch", reference ?? "(no reference)");
    return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 401 });
  }

  // Only act on successful charges. Acknowledge everything else with 200 so
  // Paystack doesn't retry.
  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: payload.event ?? "unknown-event" });
  }

  const data = payload.data as { reference: string; status: string; amount: number; channel?: string | null; paid_at?: string | null };
  if (!pending) {
    console.warn("[paystack webhook] reference not found", data.reference);
    return NextResponse.json({ ok: true, ignored: "unknown-reference" });
  }
  if (!school) {
    console.warn("[paystack webhook] no school for reference", data.reference);
    return NextResponse.json({ ok: true, ignored: "unknown-school" });
  }

  try {
    await runAsSchool(school, () =>
      applyPaymentSuccess({
        feeId: pending.feeId,
        amountNaira: koboToNaira(data.amount),
        reference: data.reference,
        method: "PAYSTACK",
        channel: data.channel ?? null,
        paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
        rawPayload: data as unknown,
      }),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[paystack webhook] apply failed", err);
    return NextResponse.json({ ok: false, error: "Apply failed" }, { status: 500 });
  }
}
