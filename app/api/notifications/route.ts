import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/notifications — latest 20 notifications for the signed-in user
 * plus the unread count. Used by the bell dropdown in PortalShell.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return NextResponse.json(
    { items, unreadCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}
