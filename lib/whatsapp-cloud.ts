/**
 * Thin Meta WhatsApp Cloud API client. Only what we need: send a text
 * message. If the required env vars aren't set, the helpers log and
 * no-op so dev environments don't blow up.
 *
 * Required env:
 * - WHATSAPP_PHONE_NUMBER_ID (from your WhatsApp Business App)
 * - WHATSAPP_ACCESS_TOKEN (long-lived system-user token recommended)
 *
 * Both are stable per-deployment values. The school's own phone number
 * itself is configured on Meta's side; we only need the PHONE_NUMBER_ID
 * Meta assigns to it.
 */

const GRAPH_VERSION = "v20.0";

interface SendResult {
  ok: boolean;
  status: number;
  messageId?: string;
  error?: string;
}

function isConfigured() {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

/**
 * Normalise a Nigerian phone number into the E.164 form Meta expects
 * (digits only, country code prefixed). Accepts:
 *   "+2348060246634" → "2348060246634"
 *   "08060246634"    → "2348060246634"
 *   "8060246634"     → "2348060246634"
 */
export function normaliseNgPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return digits; // already E.164 or another country; pass through
}

export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  if (!isConfigured()) {
    console.log("[whatsapp-cloud] not configured — would have sent to", to, ":", body.slice(0, 80));
    return { ok: false, status: 0, error: "not_configured" };
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normaliseNgPhone(to),
        type: "text",
        text: { body: body.slice(0, 4000), preview_url: true },
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = json?.error?.message ?? `HTTP ${res.status}`;
      console.error("[whatsapp-cloud] send failed", errMsg, json);
      return { ok: false, status: res.status, error: errMsg };
    }
    const messageId = json?.messages?.[0]?.id;
    return { ok: true, status: res.status, messageId };
  } catch (err) {
    console.error("[whatsapp-cloud] fetch threw", err);
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "unknown" };
  }
}

/**
 * Convenience: send and persist as an OUT WhatsAppMessage in one call.
 * Returns the underlying SendResult.
 */
export async function sendAndLog(opts: {
  to: string;
  body: string;
  sessionId: string;
}): Promise<SendResult> {
  const { prisma } = await import("./prisma");
  const result = await sendWhatsAppText(opts.to, opts.body);
  try {
    await prisma.whatsAppMessage.create({
      data: {
        sessionId: opts.sessionId,
        direction: "OUT",
        content: opts.body,
        metadata: result.messageId ? { messageId: result.messageId } : undefined,
      },
    });
  } catch (err) {
    console.error("[whatsapp-cloud] failed to log OUT message", err);
  }
  return result;
}
