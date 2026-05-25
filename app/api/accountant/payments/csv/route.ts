/**
 * CSV export of the payments ledger. Honours the same query params as
 * /portal/accountant/payments. Auth: ACCOUNTANT / ADMIN / DIRECTOR / SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvEscape(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const method = url.searchParams.get("method")?.toUpperCase();
  const status = url.searchParams.get("status")?.toUpperCase();
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: Record<string, unknown> = {};
  if (method && ["PAYSTACK", "CASH", "TRANSFER", "CHEQUE", "POS", "OTHER"].includes(method)) where.method = method;
  if (status && ["SUCCESS", "PENDING", "FAILED", "REFUNDED"].includes(status)) where.status = status;
  if (from || to) {
    where.paidAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { fee: { student: { user: { name: { contains: q, mode: "insensitive" } } } } },
      { fee: { student: { admissionNumber: { contains: q, mode: "insensitive" } } } },
      { fee: { feeType: { contains: q, mode: "insensitive" } } },
    ];
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { paidAt: "desc" },
    take: 5000, // sanity cap
    include: {
      fee: {
        include: {
          student: { include: { user: { select: { name: true, email: true } }, classRef: { select: { name: true, arm: true } } } },
          term: { include: { session: { select: { name: true } } } },
        },
      },
    },
  });

  const headers = [
    "Date",
    "Student",
    "Admission Number",
    "Class",
    "Fee Type",
    "Term",
    "Session",
    "Method",
    "Reference",
    "Channel",
    "Amount (NGN)",
    "Status",
    "Notes",
  ];

  const rows = payments.map(p => [
    p.paidAt ? p.paidAt.toISOString() : p.createdAt.toISOString(),
    p.fee.student.user.name,
    p.fee.student.admissionNumber,
    p.fee.student.classRef ? `${p.fee.student.classRef.name}${p.fee.student.classRef.arm}` : "",
    p.fee.feeType,
    p.fee.term.name,
    p.fee.term.session.name,
    p.method,
    p.reference,
    p.channel ?? "",
    Number(p.amount).toFixed(2),
    p.status,
    p.notes ?? "",
  ].map(csvEscape).join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="meclones_payments_${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
