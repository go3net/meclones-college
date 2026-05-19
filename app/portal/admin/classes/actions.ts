"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const ClassSchema = z.object({
  name: z.string().min(1, "Class name required (e.g. 'JSS 1')"),
  arm: z.string().min(1, "Arm required (e.g. 'A')").max(4),
  level: z.enum(["JSS", "SSS"]),
  classTeacherId: z.string().optional().or(z.literal("")),
  subjectIds: z.array(z.string()).optional(),
});

export async function createClass(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const subjectIds = formData.getAll("subjectIds").map(v => String(v)).filter(Boolean);
  const parsed = ClassSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    arm: String(formData.get("arm") ?? "").trim().toUpperCase(),
    level: formData.get("level"),
    classTeacherId: formData.get("classTeacherId") || undefined,
    subjectIds,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/admin/classes/new?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const exists = await prisma.class.findUnique({ where: { name_arm: { name: d.name, arm: d.arm } } });
  if (exists) {
    redirect(`/portal/admin/classes/new?error=${encodeURIComponent("That class+arm already exists.")}`);
  }

  const created = await prisma.class.create({
    data: {
      name: d.name,
      arm: d.arm,
      level: d.level,
      classTeacherId: d.classTeacherId || null,
    },
  });

  // Link subjects
  for (const subjectId of subjectIds) {
    await prisma.classSubject.create({
      data: { classId: created.id, subjectId },
    });
  }

  revalidatePath("/portal/admin/classes");
  redirect(`/portal/admin/classes?added=${encodeURIComponent(`${d.name}${d.arm}`)}`);
}

export async function updateClass(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  const subjectIds = formData.getAll("subjectIds").map(v => String(v)).filter(Boolean);
  const parsed = ClassSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    arm: String(formData.get("arm") ?? "").trim().toUpperCase(),
    level: formData.get("level"),
    classTeacherId: formData.get("classTeacherId") || undefined,
    subjectIds,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/admin/classes/${id}/edit?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  await prisma.class.update({
    where: { id },
    data: {
      name: d.name,
      arm: d.arm,
      level: d.level,
      classTeacherId: d.classTeacherId || null,
    },
  });

  // Reset class-subjects mapping
  await prisma.classSubject.deleteMany({ where: { classId: id } });
  for (const subjectId of subjectIds) {
    await prisma.classSubject.create({ data: { classId: id, subjectId } });
  }

  revalidatePath("/portal/admin/classes");
  revalidatePath(`/portal/admin/classes/${id}/edit`);
  redirect(`/portal/admin/classes?updated=${encodeURIComponent(`${d.name}${d.arm}`)}`);
}

export async function deleteClass(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");

  // Refuse to delete a class that has students. Admin must reassign first.
  const studentCount = await prisma.student.count({ where: { classId: id } });
  if (studentCount > 0) {
    redirect(`/portal/admin/classes?error=${encodeURIComponent(`Cannot delete: ${studentCount} student(s) still assigned to this class.`)}`);
  }

  await prisma.class.delete({ where: { id } });
  revalidatePath("/portal/admin/classes");
  redirect("/portal/admin/classes?deleted=1");
}
