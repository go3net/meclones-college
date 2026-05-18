"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";

export async function markAttendance(formData: FormData) {
  const teacher = await getCurrentTeacher();
  const { term } = await getActiveContext();

  const classId = String(formData.get("classId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  if (!classId || !dateStr) {
    throw new Error("classId and date are required");
  }

  // Authorization: this class must be one this teacher is assigned to,
  // or one they are form-teacher of.
  const allowedClassIds = new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.class.id),
  ]);
  if (!allowedClassIds.has(classId)) {
    throw new Error("You are not assigned to that class.");
  }

  // Parse the date as UTC midnight; the Attendance.date column is `@db.Date`.
  const date = new Date(dateStr + "T00:00:00.000Z");

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });

  // Collect marks: form field name pattern is `status:<studentId>` → PRESENT|ABSENT|LATE
  const rows = students.map(s => {
    const raw = String(formData.get(`status:${s.id}`) ?? "PRESENT").toUpperCase();
    const status = raw === "ABSENT" ? "ABSENT" : raw === "LATE" ? "LATE" : "PRESENT";
    return { studentId: s.id, status: status as "PRESENT" | "ABSENT" | "LATE" };
  });

  // Upsert each row (Attendance has @@unique([studentId, date]) so we can use upsert).
  for (const r of rows) {
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: r.studentId, date } },
      update: { status: r.status, classId, termId: term?.id ?? null, markedById: teacher.id },
      create: {
        studentId: r.studentId,
        classId,
        termId: term?.id ?? null,
        date,
        status: r.status,
        markedById: teacher.id,
      },
    });
  }

  revalidatePath("/portal/teacher/attendance");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/student");
}
