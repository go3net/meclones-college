"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireRole } from "@/lib/auth-helpers";

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

  await prisma.complaint.update({
    where: { id },
    data: {
      status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
      handledById: user.id,
      resolutionNote: status === "RESOLVED" ? resolutionNote : undefined,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  revalidatePath("/portal/admin/complaints");
  revalidatePath("/portal/parent/complaints");
}
