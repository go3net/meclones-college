/**
 * CSV export of every active student + their primary parent's contact.
 * Admin / Director / Super-admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
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
  const includeGraduated = url.searchParams.get("includeGraduated") === "1";

  const students = await prisma.student.findMany({
    where: includeGraduated ? {} : { graduatedAt: null },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      classRef: { select: { name: true, arm: true } },
      parentLinks: {
        include: { parent: { include: { user: { select: { name: true, email: true, phone: true } } } } },
      },
    },
    orderBy: [
      { classRef: { name: "asc" } },
      { classRef: { arm: "asc" } },
      { user: { name: "asc" } },
    ],
  });

  const headers = [
    "Admission Number",
    "Student Name",
    "Class",
    "Gender",
    "DOB",
    "Address",
    "Student Email",
    "Student Phone",
    "Active",
    "Graduated",
    "Parent 1 Name",
    "Parent 1 Relation",
    "Parent 1 Phone",
    "Parent 1 Email",
    "Parent 2 Name",
    "Parent 2 Relation",
    "Parent 2 Phone",
    "Parent 2 Email",
    "Joined",
  ];

  const rows = students.map(s => {
    const cls = s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "";
    const p1 = s.parentLinks[0];
    const p2 = s.parentLinks[1];
    return [
      s.admissionNumber,
      s.user.name,
      cls,
      s.gender ?? "",
      s.dob ? s.dob.toISOString().slice(0, 10) : "",
      s.address ?? "",
      s.user.email.endsWith("@meclones.local") ? "" : s.user.email,
      s.user.phone ?? "",
      s.user.isActive ? "Yes" : "No",
      s.graduatedAt ? s.graduatedAt.toISOString().slice(0, 10) : "",
      p1?.parent.user.name ?? "",
      p1?.relation ?? "",
      p1?.parent.user.phone ?? "",
      p1?.parent.user.email ?? "",
      p2?.parent.user.name ?? "",
      p2?.relation ?? "",
      p2?.parent.user.phone ?? "",
      p2?.parent.user.email ?? "",
      s.createdAt.toISOString().slice(0, 10),
    ];
  });

  const csv = buildCsv(headers, rows);

  auditLog({
    action: "export.students",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: { count: students.length, includeGraduated },
  });

  return csvResponse(`meclones_students_${todayStamp()}.csv`, csv);
}
