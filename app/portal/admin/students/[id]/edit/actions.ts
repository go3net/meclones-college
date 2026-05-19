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
  classId: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", ""]).optional(),
  dob: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export async function updateStudent(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = Schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    classId: formData.get("classId") || undefined,
    gender: formData.get("gender") || undefined,
    dob: formData.get("dob") || undefined,
    address: formData.get("address") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/students/${formData.get("id")}/edit?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const student = await prisma.student.findUnique({ where: { id: d.id } });
  if (!student) redirect("/portal/admin/students");

  await prisma.user.update({
    where: { id: student.userId },
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      phone: d.phone || null,
      isActive: d.isActive ?? true,
    },
  });
  await prisma.student.update({
    where: { id: d.id },
    data: {
      classId: d.classId || null,
      gender: d.gender ? (d.gender as "MALE" | "FEMALE") : null,
      dob: d.dob ? new Date(d.dob) : null,
      address: d.address || null,
    },
  });

  revalidatePath("/portal/admin/students");
  revalidatePath(`/portal/admin/students/${d.id}`);
  redirect(`/portal/admin/students/${d.id}?updated=1`);
}

export async function deactivateStudent(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return;
  await prisma.user.update({ where: { id: student.userId }, data: { isActive: false } });
  revalidatePath("/portal/admin/students");
  redirect("/portal/admin/students?deactivated=1");
}
