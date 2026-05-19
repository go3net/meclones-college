"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

const Schema = z.object({
  parentId: z.string().min(1),
  message: z.string().min(2),
});

/**
 * Log an outgoing WhatsApp message for a parent. The actual sending happens
 * via a wa.me deep-link the admin opens in their browser — we just record
 * what was sent for auditing, and link/upsert a WhatsAppSession against the
 * parent's phone number so admin can see history later.
 */
export async function logWhatsAppOutgoing(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const sender = await getSessionUser();

  const parsed = Schema.safeParse({
    parentId: formData.get("parentId"),
    message: String(formData.get("message") ?? "").trim(),
  });
  if (!parsed.success) {
    redirect(`/portal/admin/parents/${formData.get("parentId")}/whatsapp?error=${encodeURIComponent("Message is required")}`);
  }

  const parent = await prisma.parent.findUnique({
    where: { id: parsed.data.parentId },
    include: { user: { select: { phone: true, name: true, id: true } } },
  });
  if (!parent || !parent.user.phone) {
    redirect(`/portal/admin/parents/${parsed.data.parentId}/whatsapp?error=${encodeURIComponent("Parent has no phone number on file")}`);
  }

  const phoneNumber = parent.user.phone.replace(/\D/g, "");

  // Upsert a WhatsAppSession for this parent's phone (or create one).
  const existingSession = await prisma.whatsAppSession.findFirst({
    where: { phoneNumber },
    orderBy: { lastActivity: "desc" },
  });
  const session = existingSession
    ? await prisma.whatsAppSession.update({
        where: { id: existingSession.id },
        data: { lastActivity: new Date(), userId: parent.user.id },
      })
    : await prisma.whatsAppSession.create({
        data: { phoneNumber, userId: parent.user.id },
      });

  await prisma.whatsAppMessage.create({
    data: {
      sessionId: session.id,
      direction: "OUT",
      content: parsed.data.message,
      metadata: { sentBy: sender?.id ?? null, method: "wa.me-deeplink" },
    },
  });

  revalidatePath("/portal/whatsapp");
  revalidatePath(`/portal/admin/parents/${parsed.data.parentId}/whatsapp`);
  redirect(`/portal/admin/parents/${parsed.data.parentId}/whatsapp?sent=1`);
}
