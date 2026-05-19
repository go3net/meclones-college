"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const CellSchema = z.object({
  classId: z.string().min(1),
  day: z.enum(DAYS),
  period: z.coerce.number().int().min(1).max(20),
  subjectId: z.string().optional().or(z.literal("")),
  teacherId: z.string().optional().or(z.literal("")),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  room: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

/**
 * Upsert a single timetable cell. If subjectId/teacherId/note are all blank
 * we delete the entry instead (so "Free" stays clean).
 */
export async function setTimetableCell(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = CellSchema.safeParse({
    classId: formData.get("classId"),
    day: formData.get("day"),
    period: formData.get("period"),
    subjectId: formData.get("subjectId") || "",
    teacherId: formData.get("teacherId") || "",
    startTime: formData.get("startTime") || "",
    endTime: formData.get("endTime") || "",
    room: formData.get("room") || "",
    note: formData.get("note") || "",
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/admin/timetable?classId=${formData.get("classId")}&error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const isEmpty = !d.subjectId && !d.teacherId && !d.note;

  if (isEmpty) {
    await prisma.timetableEntry.deleteMany({
      where: { classId: d.classId, day: d.day, period: d.period },
    });
  } else {
    await prisma.timetableEntry.upsert({
      where: { classId_day_period: { classId: d.classId, day: d.day, period: d.period } },
      update: {
        subjectId: d.subjectId || null,
        teacherId: d.teacherId || null,
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        room: d.room || null,
        note: d.note || null,
      },
      create: {
        classId: d.classId,
        day: d.day,
        period: d.period,
        subjectId: d.subjectId || null,
        teacherId: d.teacherId || null,
        startTime: d.startTime || null,
        endTime: d.endTime || null,
        room: d.room || null,
        note: d.note || null,
      },
    });
  }

  auditLog({
    action: "timetable.set_cell",
    targetType: "Class",
    targetId: d.classId,
    metadata: { day: d.day, period: d.period, subjectId: d.subjectId, cleared: isEmpty },
  });

  revalidatePath(`/portal/admin/timetable`);
  redirect(`/portal/admin/timetable?classId=${d.classId}&saved=${d.day}-${d.period}`);
}

export async function clearTimetableCell(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const classId = String(formData.get("classId") ?? "");
  const day = String(formData.get("day") ?? "");
  const period = Number(formData.get("period") ?? "0");
  if (!classId || !day || !period) return;

  await prisma.timetableEntry.deleteMany({ where: { classId, day: day as never, period } });
  auditLog({ action: "timetable.clear_cell", targetType: "Class", targetId: classId, metadata: { day, period } });
  revalidatePath(`/portal/admin/timetable`);
  redirect(`/portal/admin/timetable?classId=${classId}&cleared=${day}-${period}`);
}
