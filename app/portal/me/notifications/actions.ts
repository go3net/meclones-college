"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { PREF_KEYS, type PrefKey } from "@/lib/notification-prefs";

export async function saveNotificationPrefs(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  // Read each checkbox; absent = false (unchecked).
  const data: Partial<Record<PrefKey, boolean>> = {};
  for (const key of PREF_KEYS) {
    data[key] = formData.get(key) === "on";
  }

  await prisma.notificationPrefs.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });

  revalidatePath("/portal/me/notifications");
  redirect("/portal/me/notifications?saved=1");
}
