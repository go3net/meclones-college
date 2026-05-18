"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

export async function setActiveTerm(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const termId = String(formData.get("termId") ?? "");
  if (!termId) throw new Error("termId required");

  // Single-active invariant: deactivate everything else, then activate this one.
  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw new Error("Term not found");

  await prisma.$transaction([
    prisma.term.updateMany({ data: { isActive: false } }),
    prisma.academicSession.updateMany({ data: { isActive: false } }),
    prisma.term.update({ where: { id: term.id }, data: { isActive: true } }),
    prisma.academicSession.update({ where: { id: term.sessionId }, data: { isActive: true } }),
  ]);

  revalidatePath("/portal/director/settings");
  revalidatePath("/portal/director");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/student");
}

export async function createSession(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Session name required (e.g. 2027/2028)");

  const session = await prisma.academicSession.create({
    data: { name, isActive: false },
  });
  // Pre-create the three terms.
  await prisma.term.createMany({
    data: [
      { name: "FIRST", sessionId: session.id, isActive: false },
      { name: "SECOND", sessionId: session.id, isActive: false },
      { name: "THIRD", sessionId: session.id, isActive: false },
    ],
  });

  revalidatePath("/portal/director/settings");
}
