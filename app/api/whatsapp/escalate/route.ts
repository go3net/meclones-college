import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook } from "@/lib/whatsapp";
import { SCHOOL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().optional(),
  phoneNumber: z.string().optional(),
  reason: z.string().optional(),
  rawMessage: z.string().optional(),
}).refine(b => !!b.sessionId || !!b.phoneNumber, { message: "sessionId or phoneNumber required" });

/**
 * Mark a WhatsApp session as needing human attention. n8n calls this when a
 * parent picks "Speak to Admin" or hits an unknown menu choice multiple times.
 */
export async function POST(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad payload", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { sessionId, phoneNumber, reason, rawMessage } = parsed.data;

  // Find or create the session.
  let session = sessionId
    ? await prisma.whatsAppSession.findUnique({ where: { id: sessionId } })
    : await prisma.whatsAppSession.findFirst({
        where: { phoneNumber: phoneNumber! },
        orderBy: { lastActivity: "desc" },
      });

  if (!session && phoneNumber) {
    session = await prisma.whatsAppSession.create({
      data: { phoneNumber, isEscalated: true, escalatedAt: new Date(), lastMenu: "ESCALATED" },
    });
  } else if (session) {
    session = await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: { isEscalated: true, escalatedAt: new Date(), lastMenu: "ESCALATED", lastActivity: new Date() },
    });
  }

  if (!session) {
    return NextResponse.json({ ok: false, error: "no_session" }, { status: 404 });
  }

  // Log the trigger as an inbound message for context.
  if (rawMessage) {
    await prisma.whatsAppMessage.create({
      data: {
        sessionId: session.id,
        direction: "IN",
        content: rawMessage,
        metadata: reason ? { reason } : undefined,
      },
    });
  }

  const reply = `Your message has been escalated to our admin team. We will respond within 24 hours. For urgent matters call: ${SCHOOL.phone}`;

  // Log the outgoing acknowledgement.
  await prisma.whatsAppMessage.create({
    data: { sessionId: session.id, direction: "OUT", content: reply, metadata: { kind: "escalation_ack" } },
  });

  return NextResponse.json({ ok: true, sessionId: session.id, reply });
}
