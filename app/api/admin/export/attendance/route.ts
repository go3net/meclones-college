/**
 * CSV export of attendance summary per student for the active term
 * (defaults) or any specified term. Admin / Director / Super-admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, getActiveContext } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildCsv, csvResponse, todayStamp } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const termIdParam = url.searchParams.get("termId");

  let termId = termIdParam;
  let termRow = termIdParam
    ? await prisma.term.findUnique({ where: { id: termIdParam }, include: { session: true } })
    : null;

  if (!termRow) {
    const { term } = await getActiveContext();
    if (!term) return new NextResponse("No active term", { status: 404 });
    termId = term.id;
    termRow = await prisma.term.findUnique({ where: { id: term.id }, include: { session: true } });
  }
  if (!termRow) return new NextResponse("Term not found", { status: 404 });

  // Pull every active student + their per-status counts for this term.
  const [students, marks] = await Promise.all([
    prisma.student.findMany({
      where: { graduatedAt: null },
      include: {
        user: { select: { name: true } },
        classRef: { select: { name: true, arm: true } },
      },
      orderBy: [{ classRef: { name: "asc" } }, { user: { name: "asc" } }],
    }),
    prisma.attendance.findMany({
      where: { termId: termId! },
      select: { studentId: true, status: true },
    }),
  ]);

  // Index counts by student.
  const counts = new Map<string, { present: number; absent: number; late: number }>();
  for (const m of marks) {
    if (!counts.has(m.studentId)) counts.set(m.studentId, { present: 0, absent: 0, late: 0 });
    const c = counts.get(m.studentId)!;
    if (m.status === "PRESENT") c.present++;
    else if (m.status === "ABSENT") c.absent++;
    else if (m.status === "LATE") c.late++;
  }

  const headers = [
    "Admission Number",
    "Student Name",
    "Class",
    "Term",
    "Session",
    "Days Recorded",
    "Present",
    "Absent",
    "Late",
    "Attendance Rate (%)",
  ];

  const rows = students.map(s => {
    const c = counts.get(s.id) ?? { present: 0, absent: 0, late: 0 };
    const totalRecorded = c.present + c.absent + c.late;
    const rate = totalRecorded > 0 ? Math.round((c.present / totalRecorded) * 100) : 0;
    return [
      s.admissionNumber,
      s.user.name,
      s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "",
      termRow!.name,
      termRow!.session.name,
      totalRecorded,
      c.present,
      c.absent,
      c.late,
      totalRecorded > 0 ? `${rate}` : "",
    ];
  });

  const csv = buildCsv(headers, rows);
  const stamp = `${termRow!.name.toLowerCase()}_${termRow!.session.name.replace(/\//g, "-")}`;

  auditLog({
    action: "export.attendance",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: { studentCount: students.length, termId: termRow!.id },
  });

  return csvResponse(`meclones_attendance_${stamp}_${todayStamp()}.csv`, csv);
}
