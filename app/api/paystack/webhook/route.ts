import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { applyPaymentSuccess } from "@/lib/apply-payment";
import { koboToNaira } from "@/lib/paystack";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paystack webhook. Configure this URL in the Paystack dashboard:
 *   https://<your-domain>/api/paystack/webhook
 *
 * We verify the HMAC-SHA512 signature using PAYSTACK_SECRET_KEY before
 * trusting any payload. Successful charge events are idempotently applied
 * to the matching Fee row.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[paystack webhook] PAYSTACK_SECRET_KEY missing");
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (signature !== expected) {
    console.warn("[paystack webhook] signature mismatch");
    return NextResponse.json({ ok: false, error: "Bad signature" }, { status: 401 });
  }

  let payload: { event: string; data: { reference: string; status: string; amount: number; channel?: string | null; paid_at?: string | null } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Only act on successful charges. Acknowledge everything else with 200 so
  // Paystack doesn't retry.
  if (payload.event !== "charge.success") {
    return NextResponse.json({ ok: true, ignored: payload.event });
  }

  const data = payload.data;
  const pending = await prisma.payment.findUnique({ where: { reference: data.reference } });
  if (!pending) {
    console.warn("[paystack webhook] reference not found", data.reference);
    return NextResponse.json({ ok: true, ignored: "unknown-reference" });
  }

  try {
    await applyPaymentSuccess({
      feeId: pending.feeId,
      amountNaira: koboToNaira(data.amount),
      reference: data.reference,
      method: "PAYSTACK",
      channel: data.channel ?? null,
      paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
      rawPayload: data as unknown,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[paystack webhook] apply failed", err);
    return NextResponse.json({ ok: false, error: "Apply failed" }, { status: 500 });
  }
}
