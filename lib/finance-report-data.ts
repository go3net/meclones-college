/**
 * Shared loader for the finance report PDF + the on-screen preview at
 * /portal/accountant/reports. Builds every breakdown (method / class /
 * fee-type / debtors / payment list) for a single date range against
 * the active term.
 */

import { prisma } from "./prisma";
import type { FinanceReportData } from "@/components/FinanceReportPdf";

export async function loadFinanceReportData(opts: {
  from: Date;
  to: Date;
  rangeLabel: string;
  generatedBy: string;
}): Promise<FinanceReportData | null> {
  const activeTerm = await prisma.term.findFirst({
    where: { isActive: true },
    include: { session: true },
  });
  if (!activeTerm) return null;

  // Term-wide fees (for breakdowns + outstanding).
  const fees = await prisma.fee.findMany({
    where: { termId: activeTerm.id },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
          parentLinks: { include: { parent: { include: { user: { select: { name: true, phone: true } } } } } },
        },
      },
    },
  });

  // Payments in the date range (any status — for transactions table).
  const payments = await prisma.payment.findMany({
    where: {
      status: "SUCCESS",
      paidAt: { gte: opts.from, lte: opts.to },
    },
    include: {
      fee: {
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              classRef: { select: { name: true, arm: true } },
            },
          },
        },
      },
    },
    orderBy: { paidAt: "desc" },
  });

  // Totals.
  const billed = fees.reduce((s, f) => s + Number(f.amount), 0);
  const paidTerm = fees.reduce((s, f) => s + Number(f.amountPaid), 0);
  const outstanding = fees.reduce((s, f) => s + Number(f.balance), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);

  // Method breakdown for payments in the range.
  const methodMap = new Map<string, { count: number; amount: number }>();
  for (const p of payments) {
    const k = p.method;
    if (!methodMap.has(k)) methodMap.set(k, { count: 0, amount: 0 });
    const x = methodMap.get(k)!;
    x.count++;
    x.amount += Number(p.amount);
  }
  const methodBreakdown = Array.from(methodMap.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.amount - a.amount);

  // Per-class (term).
  const classMap = new Map<string, { billed: number; paid: number; balance: number }>();
  for (const f of fees) {
    const key = f.student.classRef ? `${f.student.classRef.name}${f.student.classRef.arm}` : "Unassigned";
    if (!classMap.has(key)) classMap.set(key, { billed: 0, paid: 0, balance: 0 });
    const x = classMap.get(key)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
    x.balance += Number(f.balance);
  }
  const classBreakdown = Array.from(classMap.entries())
    .map(([className, v]) => ({
      className,
      ...v,
      collectionPct: v.billed > 0 ? Math.round((v.paid / v.billed) * 100) : 0,
    }))
    .sort((a, b) => b.billed - a.billed);

  // Per-fee-type (term).
  const ftMap = new Map<string, { billed: number; paid: number }>();
  for (const f of fees) {
    if (!ftMap.has(f.feeType)) ftMap.set(f.feeType, { billed: 0, paid: 0 });
    const x = ftMap.get(f.feeType)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
  }
  const feeTypeBreakdown = Array.from(ftMap.entries())
    .map(([feeType, v]) => ({
      feeType,
      ...v,
      collectionPct: v.billed > 0 ? Math.round((v.paid / v.billed) * 100) : 0,
    }))
    .sort((a, b) => b.billed - a.billed);

  // Per-student debt (top 15).
  const stuMap = new Map<string, { name: string; admissionNumber: string; classRef: string; parent: string | null; phone: string | null; outstanding: number }>();
  for (const f of fees) {
    const sid = f.studentId;
    if (!stuMap.has(sid)) {
      const cls = f.student.classRef ? `${f.student.classRef.name}${f.student.classRef.arm}` : "Unassigned";
      const par = f.student.parentLinks[0]?.parent.user;
      stuMap.set(sid, {
        name: f.student.user.name,
        admissionNumber: f.student.admissionNumber,
        classRef: cls,
        parent: par?.name ?? null,
        phone: par?.phone ?? null,
        outstanding: 0,
      });
    }
    stuMap.get(sid)!.outstanding += Number(f.balance);
  }
  const topDebtors = Array.from(stuMap.values())
    .filter(d => d.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 15)
    .map(d => ({
      studentName: d.name,
      admissionNumber: d.admissionNumber,
      className: d.classRef,
      parentName: d.parent,
      parentPhone: d.phone,
      outstanding: d.outstanding,
    }));

  const studentsBilled = stuMap.size;
  const debtors = Array.from(stuMap.values()).filter(d => d.outstanding > 0).length;

  return {
    rangeLabel: opts.rangeLabel,
    rangeFrom: opts.from,
    rangeTo: opts.to,
    generatedBy: opts.generatedBy,
    generatedAt: new Date(),

    totals: {
      billed,
      collected,
      outstanding,
      paymentsCount: payments.length,
      studentsBilled,
      debtors,
    },

    methodBreakdown,
    classBreakdown,
    feeTypeBreakdown,
    topDebtors,

    payments: payments.map(p => ({
      id: p.id,
      paidAt: p.paidAt,
      studentName: p.fee.student.user.name,
      admissionNumber: p.fee.student.admissionNumber,
      className: p.fee.student.classRef ? `${p.fee.student.classRef.name}${p.fee.student.classRef.arm}` : "—",
      feeType: p.fee.feeType,
      method: p.method,
      reference: p.reference,
      amount: Number(p.amount),
      reconciledAt: p.reconciledAt,
    })),
  };
}

/** Helper to derive a friendly range label from raw `from`/`to` date strings. */
export function deriveRangeLabel(from: Date, to: Date, preset: string | null): string {
  if (preset === "month") {
    return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(from);
  }
  if (preset === "term") return "Active term";
  if (preset === "today") return "Today";
  if (preset === "week") return "This week";
  const fmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
  return `${fmt.format(from)} – ${fmt.format(to)}`;
}
