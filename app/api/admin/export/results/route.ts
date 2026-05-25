/**
 * CSV export of every result row for the active term (or specified
 * term). One row per (student, subject). Admin / Director /
 * Super-admin only.
 *
 * For a classic "broadsheet" wide view, use the homeroom gradebook UI
 * — this CSV is the long format, friendlier for pivoting in Excel.
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
  const onlyPublished = url.searchParams.get("publishedOnly") === "1";

  let termRow = termIdParam
    ? await prisma.term.findUnique({ where: { id: termIdParam }, include: { session: true } })
    : null;
  if (!termRow) {
    const { term } = await getActiveContext();
    if (!term) return new NextResponse("No active term", { status: 404 });
    termRow = await prisma.term.findUnique({ where: { id: term.id }, include: { session: true } });
  }
  if (!termRow) return new NextResponse("Term not found", { status: 404 });

  const results = await prisma.result.findMany({
    where: {
      termId: termRow.id,
      ...(onlyPublished ? { isPublished: true } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
        },
      },
      subject: { select: { code: true, name: true } },
      enteredBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: [
      { student: { classRef: { name: "asc" } } },
      { student: { user: { name: "asc" } } },
      { subject: { name: "asc" } },
    ],
  });

  const headers = [
    "Admission Number",
    "Student Name",
    "Class",
    "Subject Code",
    "Subject Name",
    "CA1 (20)",
    "CA2 (20)",
    "Exam (60)",
    "Total (100)",
    "Grade",
    "Position",
    "Published",
    "Entered By",
    "Term",
    "Session",
  ];

  const rows = results.map(r => [
    r.student.admissionNumber,
    r.student.user.name,
    r.student.classRef ? `${r.student.classRef.name}${r.student.classRef.arm}` : "",
    r.subject.code,
    r.subject.name,
    r.ca1,
    r.ca2,
    r.exam,
    r.total,
    r.grade ?? "",
    r.position ?? "",
    r.isPublished ? "Yes" : "No",
    r.enteredBy?.user.name ?? "",
    termRow!.name,
    termRow!.session.name,
  ]);

  const csv = buildCsv(headers, rows);
  const stamp = `${termRow.name.toLowerCase()}_${termRow.session.name.replace(/\//g, "-")}`;

  auditLog({
    action: "export.results",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: { rowCount: results.length, termId: termRow.id, onlyPublished },
  });

  return csvResponse(`meclones_results_${stamp}_${todayStamp()}.csv`, csv);
}
