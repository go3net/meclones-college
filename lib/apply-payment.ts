import { Prisma, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPaymentReceipt } from "@/lib/resend";

interface ApplyArgs {
  feeId: string;
  amountNaira: number;
  reference: string;
  method?: PaymentMethod;
  channel?: string | null;
  paidAt?: Date;
  rawPayload?: unknown;
  notes?: string;
}

/**
 * Idempotently record a successful payment against a fee:
 *  - upsert the Payment row keyed by the unique `reference` (so retries
 *    from webhook + callback don't double-credit)
 *  - increment Fee.amountPaid and recompute balance + status
 *  - fire a receipt email (fire-and-forget; failures don't roll back)
 *
 * Safe to call from both the Paystack webhook and the user-return callback.
 */
export async function applyPaymentSuccess(args: ApplyArgs) {
  const fee = await prisma.fee.findUnique({
    where: { id: args.feeId },
    include: { student: { include: { user: true, parentLinks: { include: { parent: { include: { user: true } } } } } } },
  });
  if (!fee) throw new Error(`Fee ${args.feeId} not found`);

  const amount = new Prisma.Decimal(args.amountNaira);

  // Idempotency check — reference is unique on Payment, so if we already
  // recorded this transaction, no-op cleanly.
  const existing = await prisma.payment.findUnique({ where: { reference: args.reference } });
  if (existing && existing.status === "SUCCESS") {
    return { fee, payment: existing, alreadyApplied: true };
  }

  const payment = existing
    ? await prisma.payment.update({
        where: { id: existing.id },
        data: {
          status: "SUCCESS",
          channel: args.channel ?? null,
          paidAt: args.paidAt ?? new Date(),
          rawPayload: args.rawPayload as Prisma.InputJsonValue | undefined,
          amount,
          notes: args.notes ?? existing.notes,
        },
      })
    : await prisma.payment.create({
        data: {
          feeId: fee.id,
          amount,
          reference: args.reference,
          method: args.method ?? "PAYSTACK",
          status: "SUCCESS",
          channel: args.channel ?? null,
          paidAt: args.paidAt ?? new Date(),
          rawPayload: args.rawPayload as Prisma.InputJsonValue | undefined,
          notes: args.notes ?? null,
        },
      });

  // Update the Fee aggregate.
  const newAmountPaid = new Prisma.Decimal(fee.amountPaid).plus(amount);
  const newBalance = new Prisma.Decimal(fee.amount).minus(newAmountPaid);
  const status: "PAID" | "PARTIAL" | "UNPAID" =
    newBalance.lte(0) ? "PAID" : newAmountPaid.gt(0) ? "PARTIAL" : "UNPAID";

  const updatedFee = await prisma.fee.update({
    where: { id: fee.id },
    data: {
      amountPaid: newAmountPaid,
      balance: newBalance.lt(0) ? new Prisma.Decimal(0) : newBalance,
      status,
      paystackRef: args.method === "PAYSTACK" ? args.reference : fee.paystackRef,
    },
  });

  // Fire receipt email to parent(s) + student (if they have an email).
  const recipientEmails = new Set<string>();
  if (fee.student.user.email) recipientEmails.add(fee.student.user.email);
  for (const link of fee.student.parentLinks) {
    if (link.parent.user.email) recipientEmails.add(link.parent.user.email);
  }
  if (recipientEmails.size > 0) {
    Promise.allSettled([
      sendPaymentReceipt({
        to: Array.from(recipientEmails),
        studentName: fee.student.user.name,
        feeType: fee.feeType,
        amountPaid: Number(amount),
        newBalance: Number(updatedFee.balance),
        reference: args.reference,
        channel: args.channel ?? "online",
        paidAt: args.paidAt ?? new Date(),
        paymentId: payment.id,
      }),
    ]).catch(err => console.error("[apply-payment] receipt email failed", err));
  }

  return { fee: updatedFee, payment, alreadyApplied: false };
}
