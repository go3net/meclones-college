"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prismaBase } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireCurrentSchool } from "@/lib/tenant";
import { auditLog } from "@/lib/audit";
import { generateEmbedKey, invalidateEmbedCache, normaliseOrigin } from "@/lib/embed";

const PAGE = "/portal/director/website-widget";

async function ownSchoolId(): Promise<string> {
  const me = await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const school = await requireCurrentSchool();
  // Belt and braces: the session's school must be the host's school.
  if (me.schoolId && me.schoolId !== school.id) redirect("/portal/login");
  return school.id;
}

/** Enable/disable the widget and save the allowed-origins list. */
export async function saveWidgetSettings(formData: FormData) {
  const schoolId = await ownSchoolId();

  const enabled = formData.get("embedEnabled") === "on";
  const rawOrigins = String(formData.get("origins") ?? "");
  const origins: string[] = [];
  const bad: string[] = [];
  for (const line of rawOrigins.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const n = normaliseOrigin(t);
    if (n) { if (!origins.includes(n)) origins.push(n); } else bad.push(t);
  }
  if (bad.length > 0) {
    redirect(`${PAGE}?error=${encodeURIComponent(`Not a valid website address: ${bad[0]}`)}`);
  }
  if (origins.length > 50) {
    redirect(`${PAGE}?error=${encodeURIComponent("At most 50 websites.")}`);
  }

  await prismaBase.school.update({
    where: { id: schoolId },
    data: { embedEnabled: enabled, embedAllowedOrigins: origins },
  });
  invalidateEmbedCache();
  auditLog({ action: "widget.settings", targetType: "School", targetId: schoolId, metadata: { enabled, origins } });
  revalidatePath(PAGE);
  redirect(`${PAGE}?saved=1`);
}

/** Issue a new key; the old snippet stops working immediately. */
export async function regenerateEmbedKey() {
  const schoolId = await ownSchoolId();
  await prismaBase.school.update({ where: { id: schoolId }, data: { embedKey: generateEmbedKey() } });
  invalidateEmbedCache();
  auditLog({ action: "widget.key_regenerated", targetType: "School", targetId: schoolId });
  revalidatePath(PAGE);
  redirect(`${PAGE}?regenerated=1`);
}
