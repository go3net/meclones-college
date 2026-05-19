"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const SubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(8).regex(/^[A-Z0-9]+$/, "Use uppercase letters and digits only"),
  teacherIds: z.array(z.string()).optional(),
});

export async function createSubject(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const teacherIds = formData.getAll("teacherIds").map(v => String(v)).filter(Boolean);
  const parsed = SubjectSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    teacherIds,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/subjects/new?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const exists = await prisma.subject.findUnique({ where: { code: d.code } });
  if (exists) redirect(`/portal/admin/subjects/new?error=${encodeURIComponent(`Code "${d.code}" already in use.`)}`);

  const created = await prisma.subject.create({ data: { name: d.name, code: d.code } });
  for (const teacherId of teacherIds) {
    await prisma.subjectTeacher.create({ data: { subjectId: created.id, teacherId } });
  }

  revalidatePath("/portal/admin/subjects");
  redirect(`/portal/admin/subjects?added=${encodeURIComponent(d.name)}`);
}

export async function updateSubject(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  const teacherIds = formData.getAll("teacherIds").map(v => String(v)).filter(Boolean);
  const parsed = SubjectSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    teacherIds,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/subjects/${id}/edit?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  await prisma.subject.update({ where: { id }, data: { name: d.name, code: d.code } });
  await prisma.subjectTeacher.deleteMany({ where: { subjectId: id } });
  for (const teacherId of teacherIds) {
    await prisma.subjectTeacher.create({ data: { subjectId: id, teacherId } });
  }

  revalidatePath("/portal/admin/subjects");
  redirect(`/portal/admin/subjects?updated=${encodeURIComponent(d.name)}`);
}

export async function deleteSubject(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  const resultCount = await prisma.result.count({ where: { subjectId: id } });
  if (resultCount > 0) {
    redirect(`/portal/admin/subjects?error=${encodeURIComponent(`Cannot delete — ${resultCount} result row(s) exist for this subject.`)}`);
  }

  await prisma.subject.delete({ where: { id } });
  revalidatePath("/portal/admin/subjects");
  redirect("/portal/admin/subjects?deleted=1");
}
