"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

/** Toggle a single permission flag for a target admin user. */
export async function setPermission(formData: FormData) {
  await requireRole(["SUPER_ADMIN", "DIRECTOR"]);

  const userId = String(formData.get("userId") ?? "");
  const key = String(formData.get("key") ?? "");
  const value = String(formData.get("value") ?? "") === "true";

  const allowedKeys = [
    "canManageStudents", "canManageTeachers", "canManageParents",
    "canManageClasses", "canManageFees", "canManageResults",
    "canPublishAnnouncements", "canHandleAdmissions", "canHandleComplaints",
    "canManageLibrary", "canRotateSession",
  ];
  if (!userId || !allowedKeys.includes(key)) throw new Error("Invalid input");

  await prisma.adminPermissions.upsert({
    where: { userId },
    update: { [key]: value },
    create: {
      userId,
      [key]: value,
    },
  });

  auditLog({
    action: value ? "permission.grant" : "permission.revoke",
    targetType: "User",
    targetId: userId,
    metadata: { permission: key, granted: value },
  });

  revalidatePath("/portal/director/permissions");
}
