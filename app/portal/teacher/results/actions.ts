"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";

function gradeFor(total: number): string {
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export async function saveResults(formData: FormData) {
  const teacher = await getCurrentTeacher();
  const { session, term } = await getActiveContext();
  if (!session || !term) throw new Error("No active session/term configured.");

  const classId = String(formData.get("classId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const action = String(formData.get("action") ?? "save"); // "save" | "save_and_publish"
  if (!classId || !subjectId) throw new Error("classId and subjectId are required");

  // Authorization: teacher must be assigned to this subject AND this class.
  const allowedSubjectIds = new Set(teacher.subjects.map(s => s.subject.id));
  const allowedClassIds = new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.class.id),
  ]);
  if (!allowedSubjectIds.has(subjectId)) throw new Error("You are not assigned to that subject.");
  if (!allowedClassIds.has(classId)) throw new Error("You are not assigned to that class.");

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });

  const isPublished = action === "save_and_publish";

  for (const s of students) {
    const ca1Raw = formData.get(`ca1:${s.id}`);
    const ca2Raw = formData.get(`ca2:${s.id}`);
    const examRaw = formData.get(`exam:${s.id}`);

    // Skip rows the teacher left completely blank.
    if (ca1Raw === null && ca2Raw === null && examRaw === null) continue;

    const ca1 = clamp(Number(ca1Raw) || 0, 0, 20);
    const ca2 = clamp(Number(ca2Raw) || 0, 0, 20);
    const exam = clamp(Number(examRaw) || 0, 0, 60);
    const total = ca1 + ca2 + exam;

    await prisma.result.upsert({
      where: { studentId_subjectId_termId_sessionId: { studentId: s.id, subjectId, termId: term.id, sessionId: session.id } },
      update: {
        ca1, ca2, exam, total,
        grade: gradeFor(total),
        enteredById: teacher.id,
        ...(isPublished ? { isPublished: true } : {}),
      },
      create: {
        studentId: s.id,
        subjectId,
        termId: term.id,
        sessionId: session.id,
        ca1, ca2, exam, total,
        grade: gradeFor(total),
        enteredById: teacher.id,
        isPublished,
      },
    });
  }

  // Recompute positions within the class if published.
  if (isPublished) {
    const totals = await prisma.result.groupBy({
      by: ["studentId"],
      where: { studentId: { in: students.map(s => s.id) }, termId: term.id, isPublished: true },
      _sum: { total: true },
    });
    const ranked = totals
      .map(t => ({ studentId: t.studentId, sum: Number(t._sum.total ?? 0) }))
      .sort((a, b) => b.sum - a.sum);
    for (let i = 0; i < ranked.length; i++) {
      await prisma.result.updateMany({
        where: { studentId: ranked[i].studentId, termId: term.id, isPublished: true },
        data: { position: i + 1 },
      });
    }
  }

  revalidatePath("/portal/teacher/results");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/parent/results");
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/results");
}
