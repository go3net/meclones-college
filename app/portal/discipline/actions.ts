"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendDisciplinaryCaseFiledEmail, sendDisciplinaryResolvedEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";
import { CATEGORY_LABEL, SEVERITY_LABEL, SANCTION_LABEL } from "@/lib/discipline";

const CATEGORIES = [
  "FIGHTING", "BULLYING", "ABSENTEEISM", "LATENESS", "UNIFORM",
  "ACADEMIC_DISHONESTY", "PROPERTY_DAMAGE", "INSUBORDINATION",
  "PHONE_MISUSE", "BAD_LANGUAGE", "OTHER",
] as const;

const SEVERITIES = ["MINOR", "MODERATE", "MAJOR", "SEVERE"] as const;

const SANCTIONS = [
  "NONE", "WARNING", "DETENTION", "PARENT_MEETING", "WRITTEN_APOLOGY",
  "COMMUNITY_SERVICE", "COUNSELING",
  "SUSPENSION_1_DAY", "SUSPENSION_3_DAYS", "SUSPENSION_1_WEEK",
  "EXPULSION", "OTHER",
] as const;

const STATUSES = ["OPEN", "AWAITING_ACK", "RESOLVED", "APPEALED", "ESCALATED"] as const;

const CreateSchema = z.object({
  studentId: z.string().min(1),
  incidentDate: z.string().min(1),
  location: z.string().max(200).optional(),
  category: z.enum(CATEGORIES).default("OTHER"),
  severity: z.enum(SEVERITIES).default("MINOR"),
  description: z.string().min(5).max(4000),
  sanction: z.enum(SANCTIONS).default("NONE"),
  sanctionDetails: z.string().max(2000).optional(),
});

/**
 * Create a disciplinary case. Allowed roles: TEACHER (constrained to
 * students in their classes), ADMIN, DIRECTOR, SUPER_ADMIN.
 * Bell-pings every parent linked to the student. Audit-logged.
 */
export async function createDisciplinaryCase(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  if (!["TEACHER", "ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/portal/me");
  }

  const parsed = CreateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    const isTeacher = user.role === "TEACHER";
    const back = isTeacher
      ? `/portal/teacher/discipline/new?student=${formData.get("studentId") ?? ""}&error=${encodeURIComponent(msg)}`
      : `/portal/admin/discipline/new?student=${formData.get("studentId") ?? ""}&error=${encodeURIComponent(msg)}`;
    redirect(back);
  }
  const d = parsed.data;

  const student = await prisma.student.findUnique({
    where: { id: d.studentId },
    select: {
      classId: true,
      user: { select: { name: true } },
      parentLinks: { select: { parent: { select: { userId: true, user: { select: { name: true, email: true } } } } } },
    },
  });
  if (!student) {
    const isTeacher = user.role === "TEACHER";
    redirect((isTeacher ? "/portal/teacher" : "/portal/admin") + "/discipline?error=" + encodeURIComponent("Student not found"));
  }

  // Teachers may only file cases for students in their classes.
  if (user.role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      include: { classTeacherOf: { select: { id: true } }, classes: { select: { classId: true } } },
    });
    if (!teacher) redirect("/portal/login");
    const allowedClassIds = new Set<string>([
      ...teacher.classTeacherOf.map(c => c.id),
      ...teacher.classes.map(c => c.classId),
    ]);
    if (!student!.classId || !allowedClassIds.has(student!.classId)) {
      redirect("/portal/teacher/discipline?error=" + encodeURIComponent("Student not in your class"));
    }
  }

  // Awaiting-ack starts when there's a sanction worth acknowledging.
  const initialStatus = d.sanction !== "NONE" ? "AWAITING_ACK" : "OPEN";

  const created = await prisma.disciplinaryCase.create({
    data: {
      studentId: d.studentId,
      reportedById: user.id,
      reporterName: user.name,
      reporterRole: user.role,
      incidentDate: new Date(d.incidentDate),
      location: d.location?.trim() || null,
      category: d.category,
      severity: d.severity,
      description: d.description.trim(),
      sanction: d.sanction,
      sanctionDetails: d.sanctionDetails?.trim() || null,
      status: initialStatus,
    },
  });

  await auditLog({
    action: "discipline.create",
    targetType: "DisciplinaryCase",
    targetId: created.id,
    metadata: {
      studentId: d.studentId,
      studentName: student!.user.name,
      category: d.category,
      severity: d.severity,
      sanction: d.sanction,
    },
  });

  // Bell-ping every linked parent.
  const parentUserIds = student!.parentLinks.map(l => l.parent.userId);
  if (parentUserIds.length > 0) {
    notify({
      userIds: parentUserIds,
      type: "GENERIC",
      title: `Discipline notice: ${student!.user.name}`,
      body: `${d.category.replace(/_/g, " ").toLowerCase()} — ${d.severity.toLowerCase()} · ${d.sanction === "NONE" ? "no sanction" : d.sanction.replace(/_/g, " ").toLowerCase()}`,
      href: `/portal/parent/discipline/${created.id}`,
    }).catch(err => console.error("[discipline] notify failed", err));
  }

  // Email every linked parent with email on file.
  const parentEmails = student!.parentLinks
    .map(l => ({ email: l.parent.user.email, name: l.parent.user.name }))
    .filter(p => Boolean(p.email));
  if (parentEmails.length > 0) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
    const caseUrl = `${siteUrl}/portal/parent/discipline/${created.id}`;
    for (const p of parentEmails) {
      sendDisciplinaryCaseFiledEmail({
        to: p.email,
        parentName: p.name,
        studentName: student!.user.name,
        category: CATEGORY_LABEL[d.category],
        severity: SEVERITY_LABEL[d.severity],
        sanction: SANCTION_LABEL[d.sanction],
        description: d.description,
        caseUrl,
        needsAck: initialStatus === "AWAITING_ACK",
      }).catch(err => console.error("[discipline] email failed", err));
    }
  }

  revalidatePath("/portal/admin/discipline");
  revalidatePath("/portal/teacher/discipline");
  revalidatePath("/portal/parent/discipline");

  const detailBase = user.role === "TEACHER" ? "/portal/teacher/discipline" : "/portal/admin/discipline";
  redirect(`${detailBase}/${created.id}?created=1`);
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  category: z.enum(CATEGORIES),
  severity: z.enum(SEVERITIES),
  sanction: z.enum(SANCTIONS),
  sanctionDetails: z.string().max(2000).optional(),
  description: z.string().min(5).max(4000),
  status: z.enum(STATUSES),
});

/** Admin-only edit of a case. */
export async function updateDisciplinaryCase(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/portal/me");
  }
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const id = String(formData.get("id") ?? "");
    redirect(`/portal/admin/discipline/${id}?error=${encodeURIComponent("Invalid update")}`);
  }
  const d = parsed.data;

  const existing = await prisma.disciplinaryCase.findUnique({
    where: { id: d.id },
    select: { studentId: true, status: true, sanction: true },
  });
  if (!existing) redirect("/portal/admin/discipline?error=" + encodeURIComponent("Case not found"));

  await prisma.disciplinaryCase.update({
    where: { id: d.id },
    data: {
      category: d.category,
      severity: d.severity,
      sanction: d.sanction,
      sanctionDetails: d.sanctionDetails?.trim() || null,
      description: d.description.trim(),
      status: d.status,
    },
  });

  await auditLog({
    action: "discipline.update",
    targetType: "DisciplinaryCase",
    targetId: d.id,
    metadata: {
      before: { status: existing!.status, sanction: existing!.sanction },
      after: { status: d.status, sanction: d.sanction, severity: d.severity },
    },
  });

  revalidatePath(`/portal/admin/discipline/${d.id}`);
  revalidatePath("/portal/admin/discipline");
  redirect(`/portal/admin/discipline/${d.id}?saved=1`);
}

const ResolveSchema = z.object({
  id: z.string().min(1),
  resolutionNote: z.string().min(3).max(2000),
});

/** Mark a case resolved. Admin/director only. */
export async function resolveDisciplinaryCase(formData: FormData) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/portal/me");
  }
  const parsed = ResolveSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const id = String(formData.get("id") ?? "");
    redirect(`/portal/admin/discipline/${id}?error=${encodeURIComponent("Add a resolution note")}`);
  }
  const d = parsed.data;

  const existing = await prisma.disciplinaryCase.findUnique({
    where: { id: d.id },
    select: {
      studentId: true,
      reportedById: true,
      category: true,
      student: {
        select: {
          user: { select: { name: true } },
          parentLinks: { select: { parent: { select: { userId: true, user: { select: { name: true, email: true } } } } } },
        },
      },
    },
  });
  if (!existing) redirect("/portal/admin/discipline?error=" + encodeURIComponent("Case not found"));

  await prisma.disciplinaryCase.update({
    where: { id: d.id },
    data: {
      status: "RESOLVED",
      resolvedById: user.id,
      resolvedAt: new Date(),
      resolutionNote: d.resolutionNote.trim(),
    },
  });

  await auditLog({
    action: "discipline.resolve",
    targetType: "DisciplinaryCase",
    targetId: d.id,
    metadata: { note: d.resolutionNote },
  });

  // Tell parents + the original reporter (if not the resolver) that it's closed.
  const recipientIds = [
    ...existing!.student.parentLinks.map(l => l.parent.userId),
    ...(existing!.reportedById && existing!.reportedById !== user.id ? [existing!.reportedById] : []),
  ];
  if (recipientIds.length > 0) {
    notify({
      userIds: recipientIds,
      type: "GENERIC",
      title: "Disciplinary case resolved",
      body: d.resolutionNote.length > 140 ? d.resolutionNote.slice(0, 137) + "..." : d.resolutionNote,
      href: `/portal/parent/discipline/${d.id}`,
    }).catch(err => console.error("[discipline] notify failed", err));
  }

  // Email parents on resolution too.
  const parentEmails = existing!.student.parentLinks
    .map(l => ({ email: l.parent.user.email, name: l.parent.user.name }))
    .filter(p => Boolean(p.email));
  if (parentEmails.length > 0) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
    const caseUrl = `${siteUrl}/portal/parent/discipline/${d.id}`;
    for (const p of parentEmails) {
      sendDisciplinaryResolvedEmail({
        to: p.email,
        parentName: p.name,
        studentName: existing!.student.user.name,
        category: CATEGORY_LABEL[existing!.category],
        resolvedByName: user.name,
        resolutionNote: d.resolutionNote,
        caseUrl,
      }).catch(err => console.error("[discipline] email failed", err));
    }
  }

  revalidatePath(`/portal/admin/discipline/${d.id}`);
  revalidatePath("/portal/admin/discipline");
  redirect(`/portal/admin/discipline/${d.id}?resolved=1`);
}

const AckSchema = z.object({
  id: z.string().min(1),
  note: z.string().max(2000).optional(),
});

/**
 * Parent acknowledgement. Auth: PARENT and the case's student must be
 * linked to this parent. Records the parent's name as snapshot.
 */
export async function acknowledgeDisciplinaryCase(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") redirect("/portal/login");

  const parsed = AckSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/portal/parent/discipline?error=${encodeURIComponent("Invalid")}`);
  }
  const d = parsed.data;

  const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
  if (!parent) redirect("/portal/login");

  const existing = await prisma.disciplinaryCase.findUnique({
    where: { id: d.id },
    select: {
      studentId: true,
      reportedById: true,
      student: { select: { user: { select: { name: true } }, parentLinks: { where: { parentId: parent.id }, select: { id: true } } } },
    },
  });
  if (!existing) redirect("/portal/parent/discipline?error=" + encodeURIComponent("Case not found"));
  if (existing!.student.parentLinks.length === 0) {
    redirect("/portal/parent/discipline?error=" + encodeURIComponent("Not your child"));
  }

  await prisma.disciplinaryCase.update({
    where: { id: d.id },
    data: {
      parentAcknowledged: true,
      parentAcknowledgedAt: new Date(),
      parentAckByName: user.name,
      parentAckNote: d.note?.trim() || null,
      // Don't auto-close — admin still needs to formally resolve.
    },
  });

  await auditLog({
    action: "discipline.acknowledge",
    targetType: "DisciplinaryCase",
    targetId: d.id,
    metadata: { hasNote: Boolean(d.note?.trim()) },
  });

  // Notify the reporter.
  if (existing!.reportedById) {
    notify({
      userIds: [existing!.reportedById],
      type: "GENERIC",
      title: `Parent acknowledged: ${existing!.student.user.name}`,
      body: user.name + (d.note?.trim() ? `: ${d.note.trim().slice(0, 140)}` : " acknowledged the case."),
      href: `/portal/admin/discipline/${d.id}`,
    }).catch(err => console.error("[discipline] notify failed", err));
  }

  revalidatePath(`/portal/parent/discipline/${d.id}`);
  revalidatePath("/portal/parent/discipline");
  revalidatePath(`/portal/admin/discipline/${d.id}`);
  redirect(`/portal/parent/discipline/${d.id}?acknowledged=1`);
}
