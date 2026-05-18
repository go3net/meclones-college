import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatAttendance } from "@/lib/whatsapp";

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

  const termRecord = termId
    ? await prisma.term.findUnique({ where: { id: termId }, include: { session: true } })
    : await prisma.term.findFirst({ where: { isActive: true }, include: { session: true } });

  if (!termRecord) {
    return NextResponse.json({ ok: false, error: "no_active_term" }, { status: 404 });
  }

  const records = await prisma.attendance.findMany({
    where: { studentId: student.id, termId: termRecord.id },
    select: { status: true },
  });

  const counts = records.reduce(
    (acc, r) => {
      if (r.status === "PRESENT") acc.present++;
      else if (r.status === "ABSENT") acc.absent++;
      else if (r.status === "LATE") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );

  const termLabel = termRecord.name.charAt(0) + termRecord.name.slice(1).toLowerCase() + " Term";

  const message = formatAttendance({
    studentName: student.user.name,
    termLabel,
    sessionName: termRecord.session.name,
    ...counts,
  });

  return NextResponse.json({
    ok: true,
    student: { id: student.id, name: student.user.name },
    term: termRecord.name,
    session: termRecord.session.name,
    ...counts,
    total: counts.present + counts.absent + counts.late,
    message,
  });
}
