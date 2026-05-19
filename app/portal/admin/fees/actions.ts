"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

/**
 * Bulk-create a fee line item for every student in a class for the active term.
 * Idempotent at the (student, term, feeType) level — re-running with the same
 * feeType updates the amount but keeps the paid figure intact.
 */
const BulkSchema = z.object({
  classId: z.string().min(1),
  feeType: z.string().min(1),
  amount: z.coerce.number().min(0),
  dueDate: z.string().optional(),
});

export async function bulkChargeFee(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "ACCOUNTANT", "SUPER_ADMIN"]);

  const parsed = BulkSchema.safeParse({
    classId: formData.get("classId"),
    feeType: String(formData.get("feeType") ?? "").trim(),
    amount: formData.get("amount"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/fees?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const [session, term, students] = await Promise.all([
    prisma.academicSession.findFirst({ where: { isActive: true } }),
    prisma.term.findFirst({ where: { isActive: true } }),
    prisma.student.findMany({ where: { classId: d.classId }, select: { id: true } }),
  ]);
  if (!session || !term) redirect(`/portal/admin/fees?error=${encodeURIComponent("No active term")}`);
  if (students.length === 0) redirect(`/portal/admin/fees?error=${encodeURIComponent("No students in that class")}`);

  const amount = new Prisma.Decimal(d.amount);
  const dueDate = d.dueDate ? new Date(d.dueDate) : null;

  for (const s of students) {
    const existing = await prisma.fee.findFirst({
      where: { studentId: s.id, termId: term.id, feeType: d.feeType },
    });
    if (existing) {
      // Update the amount + recompute balance, but preserve amountPaid.
      const balance = new Prisma.Decimal(d.amount).minus(existing.amountPaid);
      await prisma.fee.update({
        where: { id: existing.id },
        data: {
          amount,
          balance: balance.lt(0) ? new Prisma.Decimal(0) : balance,
          status: balance.lte(0) ? "PAID" : existing.amountPaid.gt(0) ? "PARTIAL" : "UNPAID",
          dueDate,
        },
      });
    } else {
      await prisma.fee.create({
        data: {
          studentId: s.id,
          termId: term.id,
          sessionId: session.id,
          feeType: d.feeType,
          amount,
          amountPaid: new Prisma.Decimal(0),
          balance: amount,
          status: "UNPAID",
          dueDate,
        },
      });
    }
  }

  revalidatePath("/portal/admin/fees");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/parent/fees");
  revalidatePath("/portal/student/fees");
  redirect(`/portal/admin/fees?added=${encodeURIComponent(`${d.feeType} charged to ${students.length} students`)}`);
}

/**
 * Record a manual payment against a fee row (e.g. bank transfer or cash).
 * Adjusts amountPaid, recomputes balance + status.
 */
const PaymentSchema = z.object({
  feeId: z.string().min(1),
  amount: z.coerce.number().min(0),
  reference: z.string().optional(),
});

export async function recordPayment(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "ACCOUNTANT", "SUPER_ADMIN"]);

  const parsed = PaymentSchema.safeParse({
    feeId: formData.get("feeId"),
    amount: formData.get("amount"),
    reference: formData.get("reference") || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/fees?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const fee = await prisma.fee.findUnique({ where: { id: d.feeId } });
  if (!fee) redirect(`/portal/admin/fees?error=${encodeURIComponent("Fee not found")}`);

  const newPaid = new Prisma.Decimal(fee.amountPaid).plus(d.amount);
  const newBalance = new Prisma.Decimal(fee.amount).minus(newPaid);
  const status: "PAID" | "PARTIAL" | "UNPAID" =
    newBalance.lte(0) ? "PAID" :
    newPaid.gt(0) ? "PARTIAL" : "UNPAID";

  await prisma.fee.update({
    where: { id: d.feeId },
    data: {
      amountPaid: newPaid,
      balance: newBalance.lt(0) ? new Prisma.Decimal(0) : newBalance,
      status,
      paystackRef: d.reference || fee.paystackRef,
    },
  });

  revalidatePath("/portal/admin/fees");
  revalidatePath("/portal/parent/fees");
  revalidatePath("/portal/student/fees");
  redirect(`/portal/admin/fees?paid=1`);
}

export async function deleteFee(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  await prisma.fee.delete({ where: { id } });
  revalidatePath("/portal/admin/fees");
}
