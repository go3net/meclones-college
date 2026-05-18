"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const VALID_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "EXAM_SCHEDULED", "ADMITTED", "REJECTED"] as const;

export async function updateAdmissionStatus(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const id = String(formData.get("id") ?? "");
  const statusRaw = String(formData.get("status") ?? "").toUpperCase();
  if (!id || !VALID_STATUSES.includes(statusRaw as never)) {
    throw new Error("Invalid request.");
  }

  await prisma.admission.update({
    where: { id },
    data: { status: statusRaw as (typeof VALID_STATUSES)[number] },
  });

  revalidatePath("/portal/admin/applications");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/director");
}
