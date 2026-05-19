"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { notify } from "@/lib/notify";

const NoteSchema = z.object({
  studentId: z.string().min(1),
  category: z.enum(["ACADEMIC", "BEHAVIOUR", "ATTENDANCE", "HEALTH", "COMMENDATION", "OTHER"]).default("OTHER"),
  visibility: z.enum(["STAFF_ONLY", "ADMIN_ONLY", "PARENT_VISIBLE"]).default("STAFF_ONLY"),
  body: z.string().min(3, "Note must be at least 3 characters"),
});

/**
 * Leave a note on a student. Authorisation:
 *   - Teacher: must teach (or be form-teacher of) the student's class.
 *   - Admin / Director / Super-admin: any student.
 *   - Anyone else: rejected.
 */
export async function createStudentNote(formData: FormData) {
  const sess = await getSessionUser();
  if (!sess) redirect("/portal/login");
  if (!["TEACHER", "ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(sess.role)) {
    redirect("/portal/me");
  }

  const parsed = NoteSchema.safeParse({
    studentId: formData.get("studentId"),
    category: formData.get("category") ?? "OTHER",
    visibility: formData.get("visibility") ?? "STAFF_ONLY",
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/teacher/students/${formData.get("studentId")}?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  // Authorisation for teachers — limit to their classes.
  if (sess.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: sess.id },
      include: { classTeacherOf: { select: { id: true } }, classes: { select: { classId: true } } },
    });
    const allowed = new Set<string>([
      ...(teacher?.classTeacherOf.map(c => c.id) ?? []),
      ...(teacher?.classes.map(c => c.classId) ?? []),
    ]);
    const student = await prisma.student.findUnique({ where: { id: d.studentId }, select: { classId: true } });
    if (!student || !student.classId || !allowed.has(student.classId)) {
      redirect(`/portal/teacher/classes?error=${encodeURIComponent("Not authorised for that student")}`);
    }
  }

  const actor = await prisma.user.findUnique({ where: { id: sess.id }, select: { name: true, role: true } });

  const note = await prisma.studentNote.create({
    data: {
      studentId: d.studentId,
      authorId: sess.id,
      authorName: actor?.name ?? sess.name,
      authorRole: actor?.role ?? sess.role,
      category: d.category,
      visibility: d.visibility,
      body: d.body,
    },
  });

  auditLog({
    action: "student_note.create",
    targetType: "Student",
    targetId: d.studentId,
    metadata: { noteId: note.id, category: d.category, visibility: d.visibility },
  });

  // If the note is parent-visible, ping the linked parents' bells too.
  if (d.visibility === "PARENT_VISIBLE") {
    const links = await prisma.parentStudent.findMany({
      where: { studentId: d.studentId },
      include: { parent: { select: { userId: true } } },
    });
    const userIds = links.map(l => l.parent.userId);
    const titleMap: Record<string, string> = {
      ACADEMIC: "Academic note from school",
      BEHAVIOUR: "Behaviour note from school",
      ATTENDANCE: "Attendance note from school",
      HEALTH: "Health note from school",
      COMMENDATION: "Commendation from school",
      OTHER: "A note from school",
    };
    notify({
      userIds,
      type: "GENERIC",
      title: titleMap[d.category] ?? "Note from school",
      body: d.body.length > 200 ? d.body.slice(0, 197) + "..." : d.body,
      href: "/portal/parent",
    }).catch(err => console.error("[note] notify failed", err));
  }

  revalidatePath(`/portal/teacher/students/${d.studentId}`);
  revalidatePath(`/portal/admin/students/${d.studentId}`);
  redirect(`/portal/teacher/students/${d.studentId}?noted=1`);
}

export async function deleteStudentNote(formData: FormData) {
  await requireRole(["TEACHER", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const sess = await getSessionUser();
  if (!sess) redirect("/portal/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Allow delete if you authored the note OR are an admin/director.
  const note = await prisma.studentNote.findUnique({ where: { id } });
  if (!note) return;
  const canDelete = note.authorId === sess.id || ["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(sess.role);
  if (!canDelete) return;

  await prisma.studentNote.delete({ where: { id } });
  auditLog({ action: "student_note.delete", targetType: "StudentNote", targetId: id });
  revalidatePath(`/portal/teacher/students/${note.studentId}`);
}
