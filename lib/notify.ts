import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

type NotificationType =
  | "ANNOUNCEMENT"
  | "RESULT_PUBLISHED"
  | "FEE_CHARGED"
  | "PAYMENT_RECEIVED"
  | "COMPLAINT_REPLIED"
  | "ADMISSION_UPDATE"
  | "WHATSAPP_INCOMING"
  | "GENERIC";

interface NotifyArgs {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}

/**
 * Fan out a notification to many users in a single INSERT. Silently no-ops
 * if userIds is empty. Failures bubble up — call sites should wrap in
 * try/catch if the parent transaction shouldn't fail on notify failure.
 */
export async function notify(args: NotifyArgs) {
  if (args.userIds.length === 0) return { count: 0 };

  const data: Prisma.NotificationCreateManyInput[] = args.userIds.map(userId => ({
    userId,
    type: args.type,
    title: args.title,
    body: args.body,
    href: args.href ?? null,
  }));

  return prisma.notification.createMany({ data });
}
