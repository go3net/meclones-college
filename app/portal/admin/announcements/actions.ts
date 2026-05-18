"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

const AUDIENCES = ["ALL", "PARENTS", "STAFF", "STUDENTS", "CLASS"] as const;

export async function createAnnouncement(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const user = await getSessionUser();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audienceRaw = String(formData.get("audience") ?? "ALL").toUpperCase();
  const classId = String(formData.get("classId") ?? "").trim() || null;

  if (!title || !body) throw new Error("Title and body are required.");
  const audience = (AUDIENCES.includes(audienceRaw as never) ? audienceRaw : "ALL") as typeof AUDIENCES[number];

  await prisma.announcement.create({
    data: {
      title,
      body,
      audience,
      classId: audience === "CLASS" ? classId : null,
      authorId: user?.id ?? null,
      publishedAt: new Date(),
    },
  });

  revalidatePath("/portal/admin/announcements");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/student");
  redirect("/portal/admin/announcements?created=1");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/portal/admin/announcements");
}
