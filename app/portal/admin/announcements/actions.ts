"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { auditLog } from "@/lib/audit";

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

  const announcement = await prisma.announcement.create({
    data: {
      title,
      body,
      audience,
      classId: audience === "CLASS" ? classId : null,
      authorId: user?.id ?? null,
      publishedAt: new Date(),
    },
  });

  // Fan out notifications. Recipients depend on the announcement audience.
  fanOutAnnouncement(audience, classId, title, body, announcement.id).catch(err => {
    console.error("[announcements] notify fanout failed", err);
  });

  // Audit
  auditLog({
    action: "announcement.publish",
    targetType: "Announcement",
    targetId: announcement.id,
    metadata: { audience, classId, title },
  });

  revalidatePath("/portal/admin/announcements");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/student");
  redirect("/portal/admin/announcements?created=1");
}

async function fanOutAnnouncement(audience: string, classId: string | null, title: string, body: string, announcementId: string) {
  let where: Parameters<typeof prisma.user.findMany>[0]["where"] = {};

  switch (audience) {
    case "ALL":
      where = { isActive: true };
      break;
    case "PARENTS":
      where = { role: "PARENT", isActive: true };
      break;
    case "STAFF":
      where = { role: { in: ["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT", "TEACHER"] }, isActive: true };
      break;
    case "STUDENTS":
      where = { role: "STUDENT", isActive: true };
      break;
    case "CLASS":
      if (!classId) return;
      // Parents of students in the class, plus the students themselves.
      const students = await prisma.student.findMany({
        where: { classId },
        include: { user: { select: { id: true } }, parentLinks: { include: { parent: { include: { user: { select: { id: true } } } } } } },
      });
      const userIds = new Set<string>();
      for (const s of students) {
        userIds.add(s.user.id);
        for (const l of s.parentLinks) userIds.add(l.parent.user.id);
      }
      await notify({
        userIds: Array.from(userIds),
        type: "ANNOUNCEMENT",
        title: `Class notice: ${title}`,
        body: body.length > 200 ? body.slice(0, 197) + "..." : body,
        href: "/portal/me",
      });
      return;
  }

  const users = await prisma.user.findMany({ where, select: { id: true } });
  await notify({
    userIds: users.map(u => u.id),
    type: "ANNOUNCEMENT",
    title,
    body: body.length > 200 ? body.slice(0, 197) + "..." : body,
    href: "/portal/me",
  });
}

export async function deleteAnnouncement(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.announcement.delete({ where: { id } });
  auditLog({ action: "announcement.delete", targetType: "Announcement", targetId: id });
  revalidatePath("/portal/admin/announcements");
}
