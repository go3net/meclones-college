import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatResults } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const TERM_MAP: Record<string, "FIRST" | "SECOND" | "THIRD"> = {
  "1": "FIRST", "first": "FIRST", "FIRST": "FIRST",
  "2": "SECOND", "second": "SECOND", "SECOND": "SECOND",
  "3": "THIRD", "third": "THIRD", "THIRD": "THIRD",
};

export async function GET(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  const admissionNumber = url.searchParams.get("admissionNumber");
  const termRaw = url.searchParams.get("term") ?? "";
  const sessionId = url.searchParams.get("sessionId");

  if (!studentId && !admissionNumber) {
    return NextResponse.json({ ok: false, error: "studentId or admissionNumber is required" }, { status: 400 });
  }

  const student = studentId
    ? await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
      })
    : await prisma.student.findUnique({
        where: { admissionNumber: admissionNumber! },
        include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
      });

  if (!student) {
    return NextResponse.json({ ok: false, error: "student_not_found" }, { status: 404 });
  }

  // Resolve term: prefer query param; else active term.
  let termRecord;
  if (termRaw && TERM_MAP[termRaw]) {
    termRecord = sessionId
      ? await prisma.term.findUnique({
          where: { name_sessionId: { name: TERM_MAP[termRaw], sessionId } },
          include: { session: true },
        })
      : await prisma.term.findFirst({
          where: { name: TERM_MAP[termRaw], session: { isActive: true } },
          include: { session: true },
        });
  } else {
    termRecord = await prisma.term.findFirst({ where: { isActive: true }, include: { session: true } });
  }

  if (!termRecord) {
    return NextResponse.json({ ok: false, error: "no_active_term", message: "Results are not currently available." }, { status: 404 });
  }

  const results = await prisma.result.findMany({
    where: { studentId: student.id, termId: termRecord.id, isPublished: true },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  // Find class size + position (position is stored on the Result row, take the
  // max recorded position for this student/term to surface it; fall back null).
  const classSize = student.classId
    ? await prisma.student.count({ where: { classId: student.classId } })
    : undefined;
  const position = results.find(r => r.position !== null)?.position ?? null;

  const className = student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned";

  const message = formatResults({
    studentName: student.user.name,
    className,
    term: termRecord.name,
    sessionName: termRecord.session.name,
    position,
    classSize,
    results: results.map(r => ({ subject: r.subject.name, total: r.total, grade: r.grade })),
  });

  return NextResponse.json({
    ok: true,
    student: { id: student.id, name: student.user.name, className },
    term: termRecord.name,
    session: termRecord.session.name,
    results: results.map(r => ({ subject: r.subject.name, code: r.subject.code, total: r.total, grade: r.grade })),
    position,
    classSize,
    message,
  });
}
