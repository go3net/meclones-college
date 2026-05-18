import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().optional(),
  phoneNumber: z.string().optional(),
  direction: z.enum(["IN", "OUT"]),
  content: z.string().min(1),
  metadata: z.unknown().optional(),
}).refine(b => !!b.sessionId || !!b.phoneNumber, { message: "sessionId or phoneNumber required" });

/**
 * Log a single inbound or outbound WhatsApp message against a session.
 * n8n calls this for every leg of every conversation so the school can replay
 * what happened from the admin portal.
 */
export async function POST(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad payload", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { sessionId, phoneNumber, direction, content, metadata } = parsed.data;

  // Resolve / bootstrap a session so logs never get orphaned.
  let session = sessionId
    ? await prisma.whatsAppSession.findUnique({ where: { id: sessionId } })
    : await prisma.whatsAppSession.findFirst({
        where: { phoneNumber: phoneNumber! },
        orderBy: { lastActivity: "desc" },
      });

  if (!session && phoneNumber) {
    session = await prisma.whatsAppSession.create({
      data: { phoneNumber, lastActivity: new Date() },
    });
  } else if (session) {
    session = await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });
  }

  if (!session) {
    return NextResponse.json({ ok: false, error: "no_session" }, { status: 404 });
  }

  const msg = await prisma.whatsAppMessage.create({
    data: {
      sessionId: session.id,
      direction,
      content,
      metadata: metadata as never ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, sessionId: session.id, messageId: msg.id }, { status: 201 });
}
