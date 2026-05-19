"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

/**
 * Close the current active session and open a new one.
 * Atomic transaction: deactivates current session+terms, creates new session
 * with FIRST term active, broadcasts an announcement to the whole school.
 */
const RotateSchema = z.object({
  newSessionName: z.string().regex(/^\d{4}\/\d{4}$/, "Use format YYYY/YYYY e.g. 2027/2028"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function rotateSession(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const parsed = RotateSchema.safeParse({
    newSessionName: formData.get("newSessionName"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid session data";
    redirect(`/portal/director/sessions?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const existing = await prisma.academicSession.findUnique({ where: { name: d.newSessionName } });
  if (existing) {
    redirect(`/portal/director/sessions?error=${encodeURIComponent("Session already exists")}`);
  }

  await prisma.$transaction(async tx => {
    // Deactivate any currently-active session + its terms
    await tx.academicSession.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await tx.term.updateMany({ where: { isActive: true }, data: { isActive: false } });

    // Create new session
    const newSession = await tx.academicSession.create({
      data: {
        name: d.newSessionName,
        isActive: true,
        startDate: new Date(d.startDate),
        endDate: new Date(d.endDate),
      },
    });

    // Create the three terms; FIRST is active.
    for (const t of ["FIRST", "SECOND", "THIRD"] as const) {
      await tx.term.create({
        data: {
          name: t,
          sessionId: newSession.id,
          isActive: t === "FIRST",
        },
      });
    }

    // School-wide announcement to inform everyone.
    await tx.announcement.create({
      data: {
        title: `New academic session: ${d.newSessionName}`,
        body: `The school has commenced the ${d.newSessionName} academic session. Term 1 is now active. All previous attendance, results, and fee records from the previous session remain accessible in the archives.`,
        audience: "ALL",
        authorId: user.id,
        publishedAt: new Date(),
        sendWhatsApp: false,
      },
    });
  });

  revalidatePath("/portal/director/sessions");
  revalidatePath("/portal/director");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/student");
  revalidatePath("/portal/teacher");
  redirect(`/portal/director/sessions?rotated=${encodeURIComponent(d.newSessionName)}`);
}

/**
 * Mark a specific term as the active one within the active session.
 * Used during the academic year to advance from First → Second → Third.
 */
export async function activateTerm(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const termId = String(formData.get("termId") ?? "");
  if (!termId) throw new Error("termId required");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw new Error("Term not found");

  await prisma.$transaction([
    prisma.term.updateMany({ where: { sessionId: term.sessionId, isActive: true }, data: { isActive: false } }),
    prisma.term.update({ where: { id: termId }, data: { isActive: true } }),
  ]);

  revalidatePath("/portal/director/sessions");
}
