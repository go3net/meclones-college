import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatFees } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const admissionNumber = url.searchParams.get("admissionNumber");
  const termId = url.searchParams.get("termId");

  if (!studentId && !admissionNumber) {
    return NextResponse.json({ ok: false, error: "studentId or admissionNumber is required" }, { status: 400 });
  }

  const student = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { name: true } } },
      })
    : await prisma.student.findUnique({
        where: { admissionNumber: admissionNumber! },
        include: { user: { select: { name: true } } },
      });

  if (!student) return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });

  const where = termId
    ? { studentId: student.id, termId }
    : { studentId: student.id };

  const fees = await prisma.fee.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { feeType: true, amount: true, amountPaid: true, balance: true, status: true, dueDate: true },
  });

  const normalized = fees.map(f => ({
    feeType: f.feeType,
    amount: Number(f.amount),
    amountPaid: Number(f.amountPaid),
    balance: Number(f.balance),
    status: f.status,
  }));

  const totalBilled = normalized.reduce((s, f) => s + f.amount, 0);
  const totalPaid = normalized.reduce((s, f) => s + f.amountPaid, 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);

  const message = formatFees({ studentName: student.user.name, fees: normalized });

  return NextResponse.json({
    ok: true,
    student: { id: student.id, name: student.user.name },
    fees: normalized,
    totals: { billed: totalBilled, paid: totalPaid, outstanding },
    message,
  });
}
