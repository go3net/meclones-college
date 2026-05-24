/**
 * Meta WhatsApp Cloud API webhook receiver.
 *
 * GET  /api/whatsapp/meta — verification handshake from Meta during setup.
 *      Returns hub.challenge when hub.verify_token matches our env value.
 *
 * POST /api/whatsapp/meta — inbound message events from the WhatsApp Business
 *      Account. For each user-sent text we hand it to the FSM and send the
 *      bot's reply via the Meta Cloud API.
 *
 * Required env:
 *   WHATSAPP_VERIFY_TOKEN     — value you also paste into Meta's webhook config
 *   WHATSAPP_PHONE_NUMBER_ID  — the Meta phone-number-id (NOT the phone itself)
 *   WHATSAPP_ACCESS_TOKEN     — long-lived system-user token
 *
 * Without these the route still responds 200 (so Meta's verify ping passes
 * before you flip everything on) but does no work.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleIncoming } from "@/lib/whatsapp-fsm";
import { sendAndLog } from "@/lib/whatsapp-cloud";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected) {
    console.warn("[whatsapp/meta] verify hit but WHATSAPP_VERIFY_TOKEN not configured");
    return new NextResponse("ok", { status: 200 });
  }

  if (mode === "subscribe" && token === expected && challenge) {
    // Meta requires us to echo the challenge as plain text.
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

interface MetaTextMessage {
  from: string;
  id: string;
  type: "text" | string;
  text?: { body: string };
}

interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        messages?: MetaTextMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  // Always 200 quickly — Meta retries on non-200, and the work below
  // doesn't need to complete before we respond.
  const body: MetaWebhookPayload = await req.json().catch(() => ({}));

  // Fire-and-forget processing; we still await it within this request scope
  // so the server runtime keeps it alive, but errors don't break Meta.
  try {
    await processPayload(body);
  } catch (err) {
    console.error("[whatsapp/meta] processing error", err);
  }
  return NextResponse.json({ ok: true });
}

async function processPayload(payload: MetaWebhookPayload) {
  if (!payload?.entry?.length) return;
  for (const entry of payload.entry) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        if (msg.type !== "text" || !msg.text?.body) continue;
        await handleText(msg.from, msg.text.body);
      }
    }
  }
}

async function handleText(from: string, text: string) {
  try {
    const { outbox, sessionId } = await handleIncoming({ from, text });
    for (const m of outbox) {
      // Sequential so messages arrive in order. Meta is fast enough.
      await sendAndLog({ to: from, body: m.body, sessionId });
    }
  } catch (err) {
    console.error("[whatsapp/meta] handleText threw", err);
  }
}
