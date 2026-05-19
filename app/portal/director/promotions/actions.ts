"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { nextLevelName } from "@/lib/promotion";

/**
 * Bulk-promote every active student to their next class. Students in SS 3
 * are marked as graduated instead of moved. Same arm is preserved (a JSS
 * 1A student moves to JSS 2A); if the target class doesn't exist, the
 * student is left in place and a warning is recorded in the metadata.
 */
export async function promoteAllStudents(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "PROMOTE") {
    redirect("/portal/director/promotions?error=" + encodeURIComponent("Type PROMOTE to confirm."));
  }

  const [classes, students] = await Promise.all([
    prisma.class.findMany(),
    prisma.student.findMany({
      where: { graduatedAt: null, classId: { not: null } },
      include: { classRef: true, user: { select: { id: true, name: true } } },
    }),
  ]);

  const classByKey = new Map(classes.map(c => [`${c.name.trim().toUpperCase().replace(/\s+/g, " ")}|${c.arm}`, c]));

  let promoted = 0;
  let graduated = 0;
  let skipped = 0;
  const skippedDetails: string[] = [];

  for (const s of students) {
    if (!s.classRef) { skipped++; continue; }
    const next = nextLevelName(s.classRef.name);

    if (next === null) {
      // SS 3 → graduate. Clear class and stamp graduatedAt; keep all history.
      await prisma.student.update({
        where: { id: s.id },
        data: { classId: null, graduatedAt: new Date() },
      });
      graduated++;
    } else {
      const targetKey = `${next}|${s.classRef.arm}`;
      const target = classByKey.get(targetKey);
      if (!target) {
        skipped++;
        skippedDetails.push(`${s.user.name} → ${next} ${s.classRef.arm} (missing class)`);
        continue;
      }
      await prisma.student.update({ where: { id: s.id }, data: { classId: target.id } });
      promoted++;
    }
  }

  auditLog({
    action: "students.promote_all",
    targetType: "BulkOp",
    metadata: { promoted, graduated, skipped, skippedSample: skippedDetails.slice(0, 5) },
  });

  // Bell ping for every promoted/graduated student (best-effort).
  if (promoted + graduated > 0) {
    const promotedStudents = await prisma.student.findMany({
      where: { id: { in: students.map(s => s.id) } },
      include: { user: { select: { id: true } }, parentLinks: { include: { parent: { select: { userId: true } } } } },
    });
    const recipientIds = new Set<string>();
    for (const s of promotedStudents) {
      recipientIds.add(s.userId);
      for (const link of s.parentLinks) recipientIds.add(link.parent.userId);
    }
    notify({
      userIds: Array.from(recipientIds),
      type: "ANNOUNCEMENT",
      title: "New academic year — class updates",
      body: "Your class for the new session has been set. Log in to view your timetable and term details.",
      href: "/portal/me",
    }).catch(err => console.error("[promotions] notify failed", err));
  }

  revalidatePath("/portal/director/promotions");
  revalidatePath("/portal/admin/students");
  redirect(`/portal/director/promotions?promoted=${promoted}&graduated=${graduated}&skipped=${skipped}`);
}

/**
 * Move a single student to a different class (or graduate them by passing
 * an empty target). Useful for the "retain this student" or "fast-track
 * this student" exceptions to the bulk flow.
 */
export async function moveSingleStudent(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN", "ADMIN"]);
  const studentId = String(formData.get("studentId") ?? "");
  const targetClassId = String(formData.get("targetClassId") ?? "");
  if (!studentId) return;

  if (!targetClassId || targetClassId === "GRADUATE") {
    await prisma.student.update({
      where: { id: studentId },
      data: { classId: null, graduatedAt: new Date() },
    });
    auditLog({ action: "student.graduate", targetType: "Student", targetId: studentId });
  } else {
    await prisma.student.update({
      where: { id: studentId },
      data: { classId: targetClassId, graduatedAt: null },
    });
    auditLog({ action: "student.move_class", targetType: "Student", targetId: studentId, metadata: { targetClassId } });
  }

  revalidatePath("/portal/director/promotions");
  revalidatePath("/portal/admin/students");
}

/** Restore a graduated student (undo the graduation). */
export async function ungraduateStudent(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const studentId = String(formData.get("studentId") ?? "");
  const targetClassId = String(formData.get("targetClassId") ?? "");
  if (!studentId || !targetClassId) return;

  await prisma.student.update({
    where: { id: studentId },
    data: { classId: targetClassId, graduatedAt: null },
  });
  auditLog({ action: "student.ungraduate", targetType: "Student", targetId: studentId, metadata: { targetClassId } });
  revalidatePath("/portal/director/promotions");
}
