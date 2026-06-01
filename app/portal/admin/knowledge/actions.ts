"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { defaultKnowledgeSections } from "@/lib/school-knowledge";

const CreateSchema = z.object({
  key: z.string().min(2).max(40).regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, _ or -"),
  title: z.string().min(2).max(120),
  body: z.string().min(10).max(8000),
  sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
});

export async function createKnowledgeSection(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = CreateSchema.safeParse({
    key: String(formData.get("key") ?? "").trim().toLowerCase(),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    sortOrder: formData.get("sortOrder") || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/knowledge?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const exists = await prisma.knowledgeSection.findUnique({ where: { key: d.key } });
  if (exists) {
    redirect(`/portal/admin/knowledge?error=${encodeURIComponent("A section with that key already exists.")}`);
  }

  const created = await prisma.knowledgeSection.create({
    data: {
      key: d.key,
      title: d.title,
      body: d.body,
      sortOrder: d.sortOrder ?? 100,
      isActive: true,
    },
  });

  auditLog({
    action: "knowledge.create",
    targetType: "KnowledgeSection",
    targetId: created.id,
    metadata: { key: created.key, title: created.title },
  });

  revalidatePath("/portal/admin/knowledge");
  redirect(`/portal/admin/knowledge?added=${encodeURIComponent(created.title)}`);
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(120),
  body: z.string().min(10).max(8000),
  sortOrder: z.coerce.number().int().min(0).max(1000),
});

export async function updateKnowledgeSection(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    sortOrder: formData.get("sortOrder"),
  });
  if (!parsed.success) {
    redirect(`/portal/admin/knowledge?error=${encodeURIComponent("Invalid input")}`);
  }

  await prisma.knowledgeSection.update({
    where: { id: parsed.data.id },
    data: { title: parsed.data.title, body: parsed.data.body, sortOrder: parsed.data.sortOrder },
  });

  auditLog({ action: "knowledge.update", targetType: "KnowledgeSection", targetId: parsed.data.id });
  revalidatePath("/portal/admin/knowledge");
  redirect("/portal/admin/knowledge?saved=1");
}

export async function toggleKnowledgeActive(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/portal/admin/knowledge");

  const section = await prisma.knowledgeSection.findUnique({ where: { id } });
  if (!section) redirect("/portal/admin/knowledge?error=" + encodeURIComponent("Section not found"));

  await prisma.knowledgeSection.update({
    where: { id },
    data: { isActive: !section!.isActive },
  });

  auditLog({
    action: section!.isActive ? "knowledge.deactivate" : "knowledge.activate",
    targetType: "KnowledgeSection",
    targetId: id,
  });

  revalidatePath("/portal/admin/knowledge");
  redirect("/portal/admin/knowledge?toggled=1");
}

export async function deleteKnowledgeSection(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/portal/admin/knowledge");

  await prisma.knowledgeSection.delete({ where: { id } });
  auditLog({ action: "knowledge.delete", targetType: "KnowledgeSection", targetId: id });
  revalidatePath("/portal/admin/knowledge");
  redirect("/portal/admin/knowledge?deleted=1");
}

/**
 * Seed the table with the default Meclones-flavoured sections. Useful
 * for a brand-new white-label deploy that wants a starting point.
 */
export async function seedDefaultKnowledge() {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const defaults = defaultKnowledgeSections();
  let inserted = 0;
  for (const d of defaults) {
    const exists = await prisma.knowledgeSection.findUnique({ where: { key: d.key } });
    if (exists) continue;
    await prisma.knowledgeSection.create({ data: { ...d, isActive: true } });
    inserted++;
  }

  auditLog({ action: "knowledge.seed_defaults", metadata: { inserted } });
  revalidatePath("/portal/admin/knowledge");
  redirect(`/portal/admin/knowledge?seeded=${inserted}`);
}
