"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { sendResultsPublishedEmail } from "@/lib/resend";
import { notify } from "@/lib/notify";
import { auditLog } from "@/lib/audit";
import { SCHOOL } from "@/lib/constants";
import { loadResultSlipData } from "@/lib/result-slip-data";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResultSlipPdf } from "@/components/ResultSlipPdf";
import { createElement } from "react";

/**
 * Publish (or unpublish) all results for a (class × subject × term) batch.
 * On publish, also recompute aggregate class positions for the term.
 */
export async function setResultsPublishState(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const classId = String(formData.get("classId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const termId = String(formData.get("termId") ?? "");
  const publish = String(formData.get("publish") ?? "true") === "true";

  if (!classId || !subjectId || !termId) throw new Error("Missing required ids");

  const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
  if (students.length === 0) {
    redirect("/portal/admin/results?error=" + encodeURIComponent("No students in this class."));
  }

  await prisma.result.updateMany({
    where: { studentId: { in: students.map(s => s.id) }, subjectId, termId },
    data: { isPublished: publish },
  });

  // Recompute class-wide positions for the term (across all subjects).
  const totals = await prisma.result.groupBy({
    by: ["studentId"],
    where: { studentId: { in: students.map(s => s.id) }, termId, isPublished: true },
    _sum: { total: true },
  });
  const ranked = totals
    .map(t => ({ studentId: t.studentId, sum: Number(t._sum.total ?? 0) }))
    .sort((a, b) => b.sum - a.sum);
  for (let i = 0; i < ranked.length; i++) {
    await prisma.result.updateMany({
      where: { studentId: ranked[i].studentId, termId, isPublished: true },
      data: { position: i + 1 },
    });
  }

  // Email + in-portal notifications on publish (fire-and-forget).
  if (publish) {
    notifyResultsPublished(students.map(s => s.id), termId).catch(err => {
      console.error("[results] email batch failed", err);
    });
  }

  // Audit
  auditLog({
    action: publish ? "result.publish" : "result.unpublish",
    targetType: "ResultBatch",
    targetId: `${classId}:${subjectId}:${termId}`,
    metadata: { classId, subjectId, termId, studentCount: students.length },
  });

  revalidatePath("/portal/admin/results");
  revalidatePath("/portal/teacher/results");
  revalidatePath("/portal/student");
  revalidatePath("/portal/student/results");
  revalidatePath("/portal/parent");
  revalidatePath("/portal/parent/results");
  redirect(`/portal/admin/results?${publish ? "published" : "unpublished"}=1`);
}

/**
 * Fire one "Results published" email per student to every linked parent
 * (and to the student's own email if set). Best-effort — failures are
 * logged but don't roll back the publish.
 */
async function notifyResultsPublished(studentIds: string[], termId: string) {
  const [students, term] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        user: { select: { name: true, email: true } },
        classRef: true,
        parentLinks: { include: { parent: { include: { user: { select: { name: true, email: true } } } } } },
      },
    }),
    prisma.term.findUnique({ where: { id: termId }, include: { session: true } }),
  ]);
  if (!term) return;

  const termLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term ${term.session.name}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");

  // Collect every recipient user id for one bulk notification fan-out.
  const notifyUserIds = new Set<string>();
  for (const s of students) {
    if (s.user.email) notifyUserIds.add(s.userId);
    for (const link of s.parentLinks) {
      notifyUserIds.add(link.parent.userId);
    }
  }
  if (notifyUserIds.size > 0) {
    await notify({
      userIds: Array.from(notifyUserIds),
      type: "RESULT_PUBLISHED",
      title: `${termLabel} results published`,
      body: `Termly results are now visible in your portal. Tap to view + download the slip.`,
      href: "/portal/me",
    }).catch(err => console.error("[results] notify failed", err));
  }

  for (const s of students) {
    const classLabel = s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "—";

    // Render the PDF once per student and reuse it across all recipients
    // (parents + the student themselves). If rendering fails, send the
    // email without the attachment rather than skipping it.
    let pdfBuffer: Buffer | undefined;
    let pdfFilename: string | undefined;
    try {
      const data = await loadResultSlipData(s.id, term.id);
      if (data) {
        pdfBuffer = await renderToBuffer(createElement(ResultSlipPdf, { data }));
        const safe = s.user.name.replace(/[^a-zA-Z0-9_-]/g, "_");
        pdfFilename = `${safe}_${data.term.label.replace(/\s+/g, "")}_${data.term.sessionName.replace(/\//g, "-")}.pdf`;
      }
    } catch (err) {
      console.error("[results] PDF render failed for", s.id, err);
    }

    // Email each linked parent.
    for (const link of s.parentLinks) {
      const parent = link.parent;
      if (!parent.user.email) continue;
      try {
        await sendResultsPublishedEmail({
          to: parent.user.email,
          parentName: parent.user.name,
          studentName: s.user.name,
          termLabel,
          classLabel,
          resultUrl: `${siteUrl}/portal/results/${s.id}/slip?termId=${term.id}`,
          pdfBuffer,
          pdfFilename,
        });
      } catch (err) {
        console.error("[results] parent email failed", parent.user.email, err);
      }
    }

    // Also email the student directly if they have an email.
    if (s.user.email) {
      try {
        await sendResultsPublishedEmail({
          to: s.user.email,
          parentName: s.user.name,
          studentName: s.user.name,
          termLabel,
          classLabel,
          resultUrl: `${siteUrl}/portal/results/${s.id}/slip?termId=${term.id}`,
          pdfBuffer,
          pdfFilename,
        });
      } catch (err) {
        console.error("[results] student email failed", s.user.email, err);
      }
    }
  }
}
