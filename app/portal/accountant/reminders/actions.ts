"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { sendFeeReminderEmail } from "@/lib/resend";
import { auditLog } from "@/lib/audit";
import { SCHOOL } from "@/lib/constants";

const ReminderSchema = z.object({
  classId: z.string().optional().or(z.literal("")),
  customMessage: z.string().max(2000).optional(),
});

/**
 * Bulk fee-reminder broadcast. Sends an email + bell ping to every
 * debtor (or every debtor in a specific class). Restricted to ACCOUNTANT
 * / ADMIN / DIRECTOR / SUPER_ADMIN.
 */
export async function sendFeeReminders(formData: FormData) {
  const acting = await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();
  if (!term) {
    redirect("/portal/accountant/reminders?error=" + encodeURIComponent("No active term."));
  }

  const parsed = ReminderSchema.safeParse({
    classId: formData.get("classId") || undefined,
    customMessage: formData.get("customMessage") || undefined,
  });
  if (!parsed.success) {
    redirect("/portal/accountant/reminders?error=" + encodeURIComponent("Bad input."));
  }
  const d = parsed.data;

  // Pull every student with an outstanding fee in the active term.
  const fees = await prisma.fee.findMany({
    where: {
      termId: term!.id,
      balance: { gt: 0 },
      ...(d.classId ? { student: { classId: d.classId } } : {}),
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
          parentLinks: { include: { parent: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        },
      },
    },
  });

  // Roll-up per student.
  const byStudent = new Map<string, { name: string; classLabel: string; outstanding: number; parents: Array<{ id: string; name: string; email: string | null }> }>();
  for (const f of fees) {
    const key = f.studentId;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        name: f.student.user.name,
        classLabel: f.student.classRef ? `${f.student.classRef.name}${f.student.classRef.arm}` : "Unassigned",
        outstanding: 0,
        parents: f.student.parentLinks.map(l => ({
          id: l.parent.user.id,
          name: l.parent.user.name,
          email: l.parent.user.email,
        })),
      });
    }
    byStudent.get(key)!.outstanding += Number(f.balance);
  }

  let emailsSent = 0;
  let bellsSent = 0;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
  const portalUrl = `${siteUrl}/portal/parent/fees`;

  // Fire per-student.
  for (const stu of byStudent.values()) {
    if (stu.parents.length === 0) continue;

    const parentUserIds = stu.parents.map(p => p.id);
    // Bell ping every linked parent.
    try {
      await notify({
        userIds: parentUserIds,
        type: "GENERIC",
        title: `Fee reminder — ${stu.name}`,
        body: `Outstanding balance: ₦${stu.outstanding.toLocaleString("en-NG")} for the ${term!.name.toLowerCase()} term.`,
        href: "/portal/parent/fees",
      });
      bellsSent += parentUserIds.length;
    } catch (err) {
      console.error("[reminders] bell ping failed", err);
    }

    // Email each parent with a real address.
    for (const parent of stu.parents) {
      if (!parent.email) continue;
      try {
        await sendFeeReminderEmail({
          to: parent.email,
          parentName: parent.name,
          studentName: stu.name,
          classLabel: stu.classLabel,
          outstanding: stu.outstanding,
          termLabel: `${term!.name.charAt(0)}${term!.name.slice(1).toLowerCase()} Term`,
          portalUrl,
          customMessage: d.customMessage?.trim() || null,
        });
        emailsSent++;
      } catch (err) {
        console.error("[reminders] email failed", parent.email, err);
      }
    }
  }

  auditLog({
    action: "fees.reminders_sent",
    actor: { id: acting.id, name: acting.name, email: acting.email, role: acting.role },
    metadata: {
      classFilter: d.classId ?? "ALL",
      studentsReached: byStudent.size,
      emailsSent,
      bellsSent,
      hasCustomMessage: Boolean(d.customMessage?.trim()),
    },
  });

  revalidatePath("/portal/accountant");
  revalidatePath("/portal/accountant/reminders");
  redirect(`/portal/accountant/reminders?sent=${encodeURIComponent(`${emailsSent} email${emailsSent === 1 ? "" : "s"} + ${bellsSent} bell${bellsSent === 1 ? "" : "s"} fanned out across ${byStudent.size} student${byStudent.size === 1 ? "" : "s"}.`)}`);
}
