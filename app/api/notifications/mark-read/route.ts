import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/notifications/mark-read
 *
 * Body:
 *   { id: string }      → mark one notification read
 *   { all: true }       → mark every notification for the caller read
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { id?: string; all?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true, scope: "all" });
  }

  if (body.id) {
    // Restrict the update to the caller's own notifications.
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true, scope: "one" });
  }

  return NextResponse.json({ error: "Provide id or all=true" }, { status: 400 });
}
