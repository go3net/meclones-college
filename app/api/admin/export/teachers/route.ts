/**
 * CSV export of every teacher with their subjects, form-class duty, and
 * classes-they-teach summary. Admin / Director / Super-admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildCsv, csvResponse, todayStamp } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const teachers = await prisma.teacher.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      classTeacherOf: { select: { name: true, arm: true } },
      classes: { include: { class: { select: { name: true, arm: true } } } },
      subjects: { include: { subject: { select: { code: true, name: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const headers = [
    "Name", "Email", "Phone", "Active",
    "Form Teacher Of",
    "Subjects",
    "Teaching Classes",
    "Subject Count",
    "Class Count",
    "Bio",
    "Joined",
  ];

  const rows = teachers.map(t => [
    t.user.name,
    t.user.email,
    t.user.phone ?? "",
    t.user.isActive ? "Yes" : "No",
    t.classTeacherOf.map(c => `${c.name}${c.arm}`).join("; "),
    t.subjects.map(s => `${s.subject.code} (${s.subject.name})`).join("; "),
    t.classes.map(c => `${c.class.name}${c.class.arm}`).join("; "),
    t.subjects.length,
    t.classes.length,
    t.bio ?? "",
    t.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = buildCsv(headers, rows);

  auditLog({
    action: "export.teachers",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: { count: teachers.length },
  });

  return csvResponse(`meclones_teachers_${todayStamp()}.csv`, csv);
}
