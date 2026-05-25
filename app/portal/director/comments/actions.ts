"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser, getActiveContext } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

/**
 * Principal / director writes a per-student overall remark on their result
 * card for the active term. One submit handles the whole selected class.
 *
 * Auth: SUPER_ADMIN or DIRECTOR.
 */
export async function savePrincipalComments(formData: FormData) {
  await requireRole(["SUPER_ADMIN", "DIRECTOR"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const { session, term } = await getActiveContext();
  if (!session || !term) {
    redirect("/portal/director/comments?error=" + encodeURIComponent("No active term."));
  }
  const classId = String(formData.get("classId") ?? "");
  if (!classId) {
    redirect("/portal/director/comments?error=" + encodeURIComponent("Missing classId"));
  }

  const students = await prisma.student.findMany({
    where: { classId, graduatedAt: null },
    select: { id: true },
  });

  let savedCount = 0;
  const now = new Date();
  for (const s of students) {
    const raw = formData.get(`comment:${s.id}`);
    if (raw === null) continue;
    const text = String(raw).trim();
    const value = text.length > 0 ? text : null;

    if (value === null) {
      const existing = await prisma.studentTermReport.findUnique({
        where: { studentId_termId_sessionId: { studentId: s.id, termId: term!.id, sessionId: session!.id } },
        select: { principalComment: true },
      });
      if (!existing || existing.principalComment === null) continue;
    }

    await prisma.studentTermReport.upsert({
      where: { studentId_termId_sessionId: { studentId: s.id, termId: term!.id, sessionId: session!.id } },
      update: {
        principalComment: value,
        principalById: user.id,
        principalByName: user.name,
        principalAt: now,
      },
      create: {
        studentId: s.id,
        termId: term!.id,
        sessionId: session!.id,
        principalComment: value,
        principalById: user.id,
        principalByName: user.name,
        principalAt: now,
      },
    });
    savedCount++;
  }

  auditLog({
    action: "term_report.principal_comments_saved",
    targetType: "Class",
    targetId: classId,
    metadata: { studentCount: savedCount, termId: term!.id, sessionId: session!.id },
  });

  revalidatePath("/portal/director/comments");
  redirect(`/portal/director/comments?class=${classId}&saved=${savedCount}`);
}
