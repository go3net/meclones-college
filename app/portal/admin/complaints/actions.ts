"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth-helpers";
import { sendComplaintRepliedEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

export async function setComplaintStatus(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim() || null;

  if (!id || !["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) {
    throw new Error("Invalid status update");
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: {
      status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
      handledById: user.id,
      resolutionNote: status === "RESOLVED" ? resolutionNote : undefined,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
    include: { author: { select: { name: true, email: true } } },
  });

  // Notify the complainant by email when we resolve. authorEmail is the
  // snapshotted address taken at submission time (works even if the User row
  // is later deleted).
  if (status === "RESOLVED" && resolutionNote) {
    const recipient = updated.author?.email ?? updated.authorEmail;
    const recipientName = updated.author?.name ?? updated.authorName;
    if (recipient) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
      sendComplaintRepliedEmail({
        to: recipient,
        parentName: recipientName,
        subject: updated.subject,
        resolution: resolutionNote,
        portalUrl: `${siteUrl}/portal/parent/complaints`,
      }).catch(err => console.error("[complaints] email failed", err));
    }
  }

  revalidatePath("/portal/admin/complaints");
  revalidatePath("/portal/parent/complaints");
}
