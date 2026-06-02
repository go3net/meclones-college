/**
 * Thin Meta WhatsApp Cloud API client. Supports plain text plus the two
 * interactive message types we actually use: Reply Buttons (3 max) and
 * List messages (10 row max). If the required env vars aren't set, the
 * helpers log and no-op so dev environments don't blow up.
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

/**
 * Discriminated union for every kind of outbound the FSM emits. The FSM
 * builds these and sendAndLog dispatches to the right Meta endpoint
 * shape. Plain `{ body: string }` is treated as `{ kind: "text", body }`
 * for backwards compat with the original FSM code.
 */
export type Outbound =
  | { kind?: "text"; body: string }
  | { kind: "buttons"; body: string; buttons: Array<{ id: string; title: string }> }
  | {
      kind: "list";
      body: string;
      buttonLabel?: string;
      header?: string;
      footer?: string;
      sections: Array<{
        title?: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };

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
  return digits;
}

async function postToMeta(payload: Record<string, unknown>): Promise<SendResult> {
  if (!isConfigured()) {
    console.log("[whatsapp-cloud] not configured — would have sent", JSON.stringify(payload).slice(0, 200));
    return { ok: false, status: 0, error: "not_configured" };
  }
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = json?.error?.message ?? `HTTP ${res.status}`;
      console.error("[whatsapp-cloud] send failed", errMsg, json);
      return { ok: false, status: res.status, error: errMsg };
    }
    return { ok: true, status: res.status, messageId: json?.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp-cloud] fetch threw", err);
    return { ok: false, status: 0, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<SendResult> {
  return postToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normaliseNgPhone(to),
    type: "text",
    text: { body: body.slice(0, 4000), preview_url: true },
  });
}

export async function sendWhatsAppButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>): Promise<SendResult> {
  // Meta hard caps: 3 buttons, button title 20 chars, body 1024 chars.
  const clean = buttons.slice(0, 3).map(b => ({
    type: "reply",
    reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
  }));
  return postToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normaliseNgPhone(to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: { buttons: clean },
    },
  });
}

export async function sendWhatsAppList(
  to: string,
  body: string,
  sections: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>,
  opts?: { header?: string; footer?: string; buttonLabel?: string },
): Promise<SendResult> {
  // Meta hard caps: 10 sections, 10 rows total, row title 24 chars,
  // description 72 chars, section title 24 chars, button 20 chars.
  let remaining = 10;
  const cleanSections = sections.slice(0, 10).map(s => {
    const rows = s.rows.slice(0, remaining).map(r => ({
      id: r.id.slice(0, 200),
      title: r.title.slice(0, 24),
      description: r.description?.slice(0, 72),
    }));
    remaining -= rows.length;
    return {
      title: s.title?.slice(0, 24),
      rows,
    };
  }).filter(s => s.rows.length > 0);

  return postToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normaliseNgPhone(to),
    type: "interactive",
    interactive: {
      type: "list",
      ...(opts?.header ? { header: { type: "text", text: opts.header.slice(0, 60) } } : {}),
      body: { text: body.slice(0, 1024) },
      ...(opts?.footer ? { footer: { text: opts.footer.slice(0, 60) } } : {}),
      action: {
        button: (opts?.buttonLabel ?? "Pick one").slice(0, 20),
        sections: cleanSections,
      },
    },
  });
}

/**
 * Send one Outbound and persist it as an OUT WhatsAppMessage.
 * Dispatches to the right Meta endpoint based on the kind.
 */
export async function sendAndLog(opts: { to: string; out: Outbound; sessionId: string }): Promise<SendResult> {
  const { prisma } = await import("./prisma");
  const { to, out, sessionId } = opts;
  const kind = (("kind" in out && out.kind) || "text") as "text" | "buttons" | "list";

  let result: SendResult;
  if (kind === "buttons" && "buttons" in out) {
    result = await sendWhatsAppButtons(to, out.body, out.buttons);
  } else if (kind === "list" && "sections" in out) {
    result = await sendWhatsAppList(to, out.body, out.sections, {
      header: "header" in out ? out.header : undefined,
      footer: "footer" in out ? out.footer : undefined,
      buttonLabel: "buttonLabel" in out ? out.buttonLabel : undefined,
    });
  } else {
    result = await sendWhatsAppText(to, out.body);
  }

  try {
    await prisma.whatsAppMessage.create({
      data: {
        sessionId,
        direction: "OUT",
        content: out.body,
        metadata: {
          kind,
          messageId: result.messageId,
          ...("buttons" in out ? { buttons: out.buttons } : {}),
          ...("sections" in out ? { sections: out.sections } : {}),
        },
      },
    });
  } catch (err) {
    console.error("[whatsapp-cloud] failed to log OUT message", err);
  }
  return result;
}
