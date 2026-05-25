"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

const MarkSchema = z.object({
  paymentIds: z.union([z.string(), z.array(z.string())]),
  bankReference: z.string().max(200).optional().or(z.literal("")),
  reconciliationNote: z.string().max(500).optional().or(z.literal("")),
});

/**
 * Mark one or more SUCCESS payments as reconciled with the bank. The
 * accountant typically gathers a deposit slip and matches it against
 * a batch of TRANSFER / POS / CHEQUE payments at once.
 *
 * Restricted to ACCOUNTANT / ADMIN / DIRECTOR / SUPER_ADMIN.
 */
export async function markReconciled(formData: FormData) {
  const acting = await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const ids = formData.getAll("paymentIds").map(v => String(v)).filter(Boolean);
  if (ids.length === 0) {
    redirect("/portal/accountant/reconciliation?error=" + encodeURIComponent("Select at least one payment."));
  }

  const parsed = MarkSchema.safeParse({
    paymentIds: ids,
    bankReference: formData.get("bankReference") || undefined,
    reconciliationNote: formData.get("reconciliationNote") || undefined,
  });
  if (!parsed.success) {
    redirect("/portal/accountant/reconciliation?error=" + encodeURIComponent("Invalid input."));
  }

  const now = new Date();
  const result = await prisma.payment.updateMany({
    where: { id: { in: ids }, status: "SUCCESS" },
    data: {
      reconciledAt: now,
      reconciledById: acting.id,
      reconciledByName: acting.name,
      bankReference: parsed.data.bankReference?.trim() || null,
      reconciliationNote: parsed.data.reconciliationNote?.trim() || null,
    },
  });

  auditLog({
    action: "payment.reconciled",
    actor: { id: acting.id, name: acting.name, email: acting.email, role: acting.role },
    metadata: {
      count: result.count,
      paymentIds: ids,
      bankReference: parsed.data.bankReference ?? null,
    },
  });

  revalidatePath("/portal/accountant/reconciliation");
  revalidatePath("/portal/accountant");
  redirect(`/portal/accountant/reconciliation?done=${result.count}`);
}

/** Undo a reconciliation (e.g. if matched the wrong deposit). */
export async function unmarkReconciled(formData: FormData) {
  const acting = await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("paymentId") ?? "");
  if (!id) redirect("/portal/accountant/reconciliation?error=" + encodeURIComponent("Missing paymentId"));

  await prisma.payment.update({
    where: { id },
    data: {
      reconciledAt: null,
      reconciledById: null,
      reconciledByName: null,
      bankReference: null,
      reconciliationNote: null,
    },
  });

  auditLog({
    action: "payment.unreconciled",
    actor: { id: acting.id, name: acting.name, email: acting.email, role: acting.role },
    targetType: "Payment",
    targetId: id,
  });

  revalidatePath("/portal/accountant/reconciliation");
  redirect("/portal/accountant/reconciliation?undone=1");
}
