"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { applyPaymentSuccess } from "@/lib/apply-payment";
import { auditLog } from "@/lib/audit";

const RecordSchema = z.object({
  feeId: z.string().min(1),
  amount: z.coerce.number().min(0.01),
  method: z.enum(["CASH", "TRANSFER", "POS", "CHEQUE", "OTHER"]),
  reference: z.string().max(120).optional(),
  paidAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Record a manual (cash / transfer / cheque / POS) payment against a fee.
 * Uses applyPaymentSuccess so the same code path runs as Paystack — bell
 * notifications, receipt email, idempotency on reference, etc.
 *
 * Reference defaults to `MANUAL-<feeId>-<paidAt>` so each manual payment
 * gets a unique idempotency key without the accountant having to invent one.
 */
export async function recordManualPayment(formData: FormData) {
  const user = await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = RecordSchema.safeParse({
    feeId: formData.get("feeId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
    paidAt: formData.get("paidAt") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/accountant/record-payment?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const fee = await prisma.fee.findUnique({
    where: { id: d.feeId },
    select: { id: true, studentId: true, balance: true, student: { select: { user: { select: { name: true } } } } },
  });
  if (!fee) {
    redirect(`/portal/accountant/record-payment?error=${encodeURIComponent("Fee not found")}`);
  }
  if (Number(fee!.balance) === 0) {
    redirect(`/portal/accountant/record-payment?error=${encodeURIComponent("This fee is already fully paid.")}`);
  }

  const paidAt = d.paidAt ? new Date(d.paidAt) : new Date();
  const reference = d.reference?.trim() || `MANUAL-${fee.id}-${paidAt.getTime()}`;

  try {
    const result = await applyPaymentSuccess({
      feeId: fee.id,
      amountNaira: d.amount,
      reference,
      method: d.method,
      channel: d.method.toLowerCase(),
      paidAt,
      notes: d.notes ?? null,
    });

    auditLog({
      action: "payment.manual_recorded",
      targetType: "Payment",
      targetId: result.payment.id,
      metadata: {
        feeId: fee.id,
        studentName: fee.student.user.name,
        method: d.method,
        amount: d.amount,
      },
    });

    revalidatePath("/portal/accountant");
    revalidatePath("/portal/accountant/payments");
    revalidatePath("/portal/accountant/debtors");
    redirect(`/portal/parent/fees/receipt/${result.payment.id}?recorded=1`);
  } catch (err) {
    console.error("[record-payment] failed", err);
    const msg = err instanceof Error ? err.message : "Failed to record payment";
    redirect(`/portal/accountant/record-payment?error=${encodeURIComponent(msg)}`);
  }
}
