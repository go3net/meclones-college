import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction, koboToNaira } from "@/lib/paystack";
import { applyPaymentSuccess } from "@/lib/apply-payment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paystack redirects the user back here after they complete (or cancel) the
 * hosted-page payment. We always verify the transaction with Paystack
 * server-to-server — never trust the browser-side `?status=success`.
 *
 * Successful path: redirect to /portal/parent/fees/receipt/<paymentId>
 * Failed path:     redirect to /portal/parent/fees?paymentError=...
 */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  if (!reference) {
    return NextResponse.redirect(new URL("/portal/parent/fees?paymentError=missing-reference", req.url));
  }

  const pending = await prisma.payment.findUnique({ where: { reference } });
  if (!pending) {
    return NextResponse.redirect(new URL(`/portal/parent/fees?paymentError=unknown-reference`, req.url));
  }

  // If the webhook already settled this, jump straight to the receipt.
  if (pending.status === "SUCCESS") {
    return NextResponse.redirect(new URL(`/portal/parent/fees/receipt/${pending.id}`, req.url));
  }

  try {
    const tx = await verifyTransaction(reference);
    if (tx.status !== "success") {
      await prisma.payment.update({
        where: { reference },
        data: {
          status: "FAILED",
          rawPayload: tx as unknown as Parameters<typeof prisma.payment.update>[0]["data"]["rawPayload"],
        },
      });
      return NextResponse.redirect(new URL(`/portal/parent/fees?paymentError=transaction-${tx.status}`, req.url));
    }

    const result = await applyPaymentSuccess({
      feeId: pending.feeId,
      amountNaira: koboToNaira(tx.amount),
      reference,
      method: "PAYSTACK",
      channel: tx.channel,
      paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
      rawPayload: tx as unknown,
    });

    return NextResponse.redirect(new URL(`/portal/parent/fees/receipt/${result.payment.id}`, req.url));
  } catch (err) {
    console.error("[paystack callback] verify failed", err);
    return NextResponse.redirect(new URL(`/portal/parent/fees?paymentError=verify-failed`, req.url));
  }
}
