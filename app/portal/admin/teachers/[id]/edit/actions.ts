"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  photoUrl: z.string().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export async function updateTeacher(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const subjectIds = formData.getAll("subjectIds").map(v => String(v)).filter(Boolean);
  const classIds = formData.getAll("classIds").map(v => String(v)).filter(Boolean);

  const parsed = Schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    bio: formData.get("bio") || undefined,
    photoUrl: formData.get("photoUrl") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/teachers/${formData.get("id")}/edit?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const teacher = await prisma.teacher.findUnique({ where: { id: d.id } });
  if (!teacher) redirect("/portal/admin/teachers");

  await prisma.user.update({
    where: { id: teacher.userId },
    data: { name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, isActive: d.isActive ?? true, image: d.photoUrl || null },
  });
  await prisma.teacher.update({ where: { id: d.id }, data: { bio: d.bio || null } });

  // Reset subject + class links
  await prisma.subjectTeacher.deleteMany({ where: { teacherId: d.id } });
  for (const subjectId of subjectIds) {
    await prisma.subjectTeacher.create({ data: { teacherId: d.id, subjectId } });
  }
  await prisma.classTeacher.deleteMany({ where: { teacherId: d.id } });
  for (const classId of classIds) {
    await prisma.classTeacher.create({ data: { teacherId: d.id, classId } });
  }

  revalidatePath("/portal/admin/teachers");
  redirect(`/portal/admin/teachers?updated=${encodeURIComponent(d.name)}`);
}

export async function deactivateTeacher(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const teacher = await prisma.teacher.findUnique({ where: { id } });
  if (!teacher) return;
  await prisma.user.update({ where: { id: teacher.userId }, data: { isActive: false } });
  revalidatePath("/portal/admin/teachers");
  redirect("/portal/admin/teachers?deactivated=1");
}
