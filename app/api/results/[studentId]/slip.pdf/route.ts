/**
 * PDF result-slip endpoint. GET this URL to download a real PDF of a
 * student's result for a specific term. Same auth as the HTML slip page:
 *   - Admin / Director / Super-admin / Accountant: any student
 *   - Student: themselves only
 *   - Parent: only their linked children
 *
 * Query params:
 *   termId  — optional; defaults to the active term
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getActiveContext } from "@/lib/auth-helpers";
import { loadResultSlipData } from "@/lib/result-slip-data";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResultSlipPdf } from "@/components/ResultSlipPdf";
import { createElement } from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { studentId: string } },
) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: {
      id: true,
      userId: true,
      admissionNumber: true,
      user: { select: { name: true } },
    },
  });
  if (!student) return new NextResponse("Not found", { status: 404 });

  // Authorisation mirrors the HTML slip page.
  const role = user.role;
  const isStaff = ["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(role);
  if (!isStaff) {
    if (role === "STUDENT") {
      if (student.userId !== user.id) return new NextResponse("Forbidden", { status: 403 });
    } else if (role === "PARENT") {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent) return new NextResponse("Forbidden", { status: 403 });
      const linked = await prisma.parentStudent.findFirst({ where: { parentId: parent.id, studentId: student.id } });
      if (!linked) return new NextResponse("Forbidden", { status: 403 });
    } else if (role === "TEACHER") {
      // Teachers can grab slips for students in their own classes.
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
        include: { classes: { select: { classId: true } }, classTeacherOf: { select: { id: true } } },
      });
      const stu = await prisma.student.findUnique({ where: { id: student.id }, select: { classId: true } });
      const allowed = new Set<string>([
        ...(teacher?.classTeacherOf.map(c => c.id) ?? []),
        ...(teacher?.classes.map(c => c.classId) ?? []),
      ]);
      if (!stu?.classId || !allowed.has(stu.classId)) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Resolve term.
  const url = new URL(req.url);
  const termIdParam = url.searchParams.get("termId");
  let termId = termIdParam ?? "";
  if (!termId) {
    const { term } = await getActiveContext();
    if (!term) return new NextResponse("No active term", { status: 404 });
    termId = term.id;
  }

  const data = await loadResultSlipData(student.id, termId);
  if (!data) return new NextResponse("Slip data missing", { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(createElement(ResultSlipPdf, { data }));
  } catch (err) {
    console.error("[slip.pdf] render failed", err);
    return new NextResponse("PDF render failed", { status: 500 });
  }

  const safeName = student.user.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeName}_${data.term.label.replace(/\s+/g, "")}_${data.term.sessionName.replace(/\//g, "-")}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
