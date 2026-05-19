"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

/**
 * Publish (or unpublish) all results for a (class × subject × term) batch.
 * On publish, also recompute aggregate class positions for the term.
 */
export async function setResultsPublishState(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const classId = String(formData.get("classId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const termId = String(formData.get("termId") ?? "");
  const publish = String(formData.get("publish") ?? "true") === "true";

  if (!classId || !subjectId || !termId) throw new Error("Missing required ids");

  const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
  if (students.length === 0) {
    redirect("/portal/admin/results?error=" + encodeURIComponent("No students in this class."));
  }

  await prisma.result.updateMany({
    where: { studentId: { in: students.map(s => s.id) }, subjectId, termId },
    data: { isPublished: publish },
  });

  // Recompute class-wide positions for the term (across all subjects).
  const totals = await prisma.result.groupBy({
    by: ["studentId"],
    where: { studentId: { in: students.map(s => s.id) }, termId, isPublished: true },
    _sum: { total: true },
  });
  const ranked = totals
    .map(t => ({ studentId: t.studentId, sum: Number(t._sum.total ?? 0) }))
    .sort((a, b) => b.sum - a.sum);
  for (let i = 0; i < ranked.length; i++) {
    await prisma.result.updateMany({
      where: { studentId: ranked[i].studentId, termId, isPublished: true },
      data: { position: i + 1 },
    });
  }

  revalidatePath("/portal/admin/results");
  revalidatePath("/portal/teacher/results");
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/results");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/parent/results");
  redirect(`/portal/admin/results?${publish ? "published" : "unpublished"}=1`);
}
