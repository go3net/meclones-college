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
  whatsappOptIn: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function updateParent(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const studentIds = formData.getAll("studentIds").map(v => String(v)).filter(Boolean);

  const parsed = Schema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    whatsappOptIn: formData.get("whatsappOptIn") === "on",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/parents/${formData.get("id")}/edit?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const parent = await prisma.parent.findUnique({ where: { id: d.id } });
  if (!parent) redirect("/portal/admin/parents");

  await prisma.user.update({
    where: { id: parent.userId },
    data: { name: d.name, email: d.email.toLowerCase(), phone: d.phone || null, isActive: d.isActive ?? true },
  });
  await prisma.parent.update({ where: { id: d.id }, data: { whatsappOptIn: !!d.whatsappOptIn } });

  await prisma.parentStudent.deleteMany({ where: { parentId: d.id } });
  for (const sid of studentIds) {
    await prisma.parentStudent.create({ data: { parentId: d.id, studentId: sid, relation: "Parent" } });
  }

  revalidatePath("/portal/admin/parents");
  redirect(`/portal/admin/parents?updated=${encodeURIComponent(d.name)}`);
}

export async function deactivateParent(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  const parent = await prisma.parent.findUnique({ where: { id } });
  if (!parent) return;
  await prisma.user.update({ where: { id: parent.userId }, data: { isActive: false } });
  revalidatePath("/portal/admin/parents");
  redirect("/portal/admin/parents?deactivated=1");
}
