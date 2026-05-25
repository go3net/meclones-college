"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

/**
 * Form teacher writes / updates their overall comment for every student in
 * their homeroom for the active term. One submit handles the whole class —
 * blank inputs are saved as null (so the teacher can clear a comment).
 *
 * Auth: caller must be the classTeacherId of the target class. The students
 * must belong to that class.
 */
export async function saveClassTeacherComments(formData: FormData) {
  const teacher = await getCurrentTeacher();
  const { session, term } = await getActiveContext();
  if (!session || !term) {
    redirect("/portal/teacher/comments?error=" + encodeURIComponent("No active term."));
  }

  const classId = String(formData.get("classId") ?? "");
  if (!classId) {
    redirect("/portal/teacher/comments?error=" + encodeURIComponent("Missing classId"));
  }

  // Authorise: teacher must be the form teacher of this class.
  const allowedClassIds = new Set(teacher.classTeacherOf.map(c => c.id));
  if (!allowedClassIds.has(classId)) {
    redirect("/portal/teacher/comments?error=" + encodeURIComponent("Not your homeroom."));
  }

  const students = await prisma.student.findMany({
    where: { classId, graduatedAt: null },
    select: { id: true },
  });

  let savedCount = 0;
  const now = new Date();
  for (const s of students) {
    const raw = formData.get(`comment:${s.id}`);
    if (raw === null) continue; // Missing field — leave untouched.
    const text = String(raw).trim();
    const commentValue = text.length > 0 ? text : null;

    // Skip if blank AND no row exists — saves write churn.
    if (commentValue === null) {
      const existing = await prisma.studentTermReport.findUnique({
        where: { studentId_termId_sessionId: { studentId: s.id, termId: term!.id, sessionId: session!.id } },
        select: { classTeacherComment: true },
      });
      if (!existing || existing.classTeacherComment === null) continue;
    }

    await prisma.studentTermReport.upsert({
      where: { studentId_termId_sessionId: { studentId: s.id, termId: term!.id, sessionId: session!.id } },
      update: {
        classTeacherComment: commentValue,
        classTeacherById: teacher.userId,
        classTeacherByName: teacher.user.name,
        classTeacherAt: now,
      },
      create: {
        studentId: s.id,
        termId: term!.id,
        sessionId: session!.id,
        classTeacherComment: commentValue,
        classTeacherById: teacher.userId,
        classTeacherByName: teacher.user.name,
        classTeacherAt: now,
      },
    });
    savedCount++;
  }

  auditLog({
    action: "term_report.class_teacher_comments_saved",
    targetType: "Class",
    targetId: classId,
    metadata: { studentCount: savedCount, termId: term!.id, sessionId: session!.id },
  });

  revalidatePath("/portal/teacher/comments");
  revalidatePath("/portal/results");
  redirect(`/portal/teacher/comments?saved=${savedCount}`);
}
