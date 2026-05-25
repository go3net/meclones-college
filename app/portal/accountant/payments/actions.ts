"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { sendPaymentReceipt } from "@/lib/resend";
import { auditLog } from "@/lib/audit";

/**
 * Manually re-send the receipt email for a SUCCESS payment. The original
 * receipt also goes out automatically when applyPaymentSuccess runs; this
 * action exists for cases where the parent says "I never got it".
 */
export async function resendPaymentReceipt(formData: FormData) {
  const acting = await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) {
    redirect("/portal/accountant/payments?error=" + encodeURIComponent("Missing paymentId"));
  }

  const p = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      fee: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              parentLinks: { include: { parent: { include: { user: { select: { email: true } } } } } },
            },
          },
        },
      },
    },
  });
  if (!p) redirect("/portal/accountant/payments?error=" + encodeURIComponent("Payment not found"));

  if (p!.status !== "SUCCESS") {
    redirect("/portal/accountant/payments?error=" + encodeURIComponent("Can only resend receipts for successful payments."));
  }

  const emails = new Set<string>();
  if (p!.fee.student.user.email && !p!.fee.student.user.email.endsWith("@meclones.local")) {
    emails.add(p!.fee.student.user.email);
  }
  for (const link of p!.fee.student.parentLinks) {
    if (link.parent.user.email) emails.add(link.parent.user.email);
  }

  if (emails.size === 0) {
    redirect("/portal/accountant/payments?error=" + encodeURIComponent("No email on file for this student or any linked parent."));
  }

  try {
    await sendPaymentReceipt({
      to: Array.from(emails),
      studentName: p!.fee.student.user.name,
      feeType: p!.fee.feeType,
      amountPaid: Number(p!.amount),
      newBalance: Number(p!.fee.balance),
      reference: p!.reference,
      channel: p!.channel ?? p!.method.toLowerCase(),
      paidAt: p!.paidAt ?? p!.createdAt,
      paymentId: p!.id,
    });
  } catch (err) {
    console.error("[payments/resend] receipt send failed", err);
    redirect("/portal/accountant/payments?error=" + encodeURIComponent("Resend failed — check Resend logs."));
  }

  auditLog({
    action: "payment.receipt_resent",
    actor: { id: acting.id, name: acting.name, email: acting.email, role: acting.role },
    targetType: "Payment",
    targetId: p!.id,
    metadata: { recipients: Array.from(emails), reference: p!.reference },
  });

  revalidatePath("/portal/accountant/payments");
  redirect(`/portal/accountant/payments?resent=${encodeURIComponent(p!.fee.student.user.name)}`);
}
