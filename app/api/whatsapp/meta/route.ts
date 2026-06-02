/**
 * Meta WhatsApp Cloud API webhook receiver.
 *
 * GET  /api/whatsapp/meta — verification handshake from Meta during setup.
 *      Returns hub.challenge when hub.verify_token matches our env value.
 *
 * POST /api/whatsapp/meta — inbound message events from the WhatsApp Business
 *      Account. Each user-sent message (text, button reply, list selection)
 *      is normalised to a single string input and handed to the FSM. The
 *      FSM emits typed Outbounds which we dispatch via sendAndLog.
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
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

interface MetaButtonReply {
  id: string;
  title: string;
}
interface MetaListReply {
  id: string;
  title: string;
  description?: string;
}

interface MetaInteractive {
  type: "button_reply" | "list_reply" | string;
  button_reply?: MetaButtonReply;
  list_reply?: MetaListReply;
}

interface MetaMessage {
  from: string;
  id: string;
  type: "text" | "interactive" | "button" | string;
  text?: { body: string };
  interactive?: MetaInteractive;
  /** Some legacy template-button replies arrive as type=button. */
  button?: { payload?: string; text?: string };
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
        messages?: MetaMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
}

export async function POST(req: NextRequest) {
  const body: MetaWebhookPayload = await req.json().catch(() => ({}));
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
        const input = extractInput(msg);
        if (input === null) continue;
        await handleMessage(msg.from, input);
      }
    }
  }
}

/**
 * Convert any inbound message shape (text, button_reply, list_reply,
 * legacy quick-reply button) into a single string the FSM can dispatch
 * on. For interactive replies, the row/button id is preferred — the
 * FSM uses it as the canonical command token (e.g. "attend:JSS3B").
 */
function extractInput(msg: MetaMessage): string | null {
  if (msg.type === "text" && msg.text?.body) {
    return msg.text.body;
  }
  if (msg.type === "interactive" && msg.interactive) {
    if (msg.interactive.type === "button_reply" && msg.interactive.button_reply) {
      return msg.interactive.button_reply.id || msg.interactive.button_reply.title;
    }
    if (msg.interactive.type === "list_reply" && msg.interactive.list_reply) {
      return msg.interactive.list_reply.id || msg.interactive.list_reply.title;
    }
  }
  if (msg.type === "button" && msg.button) {
    return msg.button.payload || msg.button.text || null;
  }
  return null;
}

async function handleMessage(from: string, text: string) {
  try {
    const { outbox, sessionId } = await handleIncoming({ from, text });
    for (const out of outbox) {
      // Sequential so messages arrive in order. Meta is fast enough.
      await sendAndLog({ to: from, out, sessionId });
    }
  } catch (err) {
    console.error("[whatsapp/meta] handleMessage threw", err);
  }
}
