/**
 * The school front-desk AI chat, shared by the on-site widget
 * (/api/website-chat) and the embeddable widget (/api/embed/chat).
 *
 * Streams answers from Claude grounded in the school's knowledge base.
 * Response is newline-delimited JSON: { type: "delta", text } chunks
 * followed by { type: "end" }. Without ANTHROPIC_API_KEY it answers from
 * the keyword FAQ so the widget stays useful.
 */

import type { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSchoolKnowledge } from "./school-knowledge";
import { staticFaqAnswer, genericFallback } from "./school-faq";
import type { SchoolPublic } from "./school-public";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── In-memory rate limiter (per process; fine at school traffic scale) ──
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitHit(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
}

export function rateLimitedResponse(extraHeaders: HeadersInit = {}): Response {
  return new Response(
    JSON.stringify({ error: "rate_limited", message: "Please slow down a bit — try again in a moment." }),
    { status: 429, headers: { "Content-Type": "application/json", ...extraHeaders } },
  );
}

/** Validate the request body; keeps the last 20 turns. */
export function parseMessages(body: unknown): { ok: true; messages: ChatMessage[] } | { ok: false; error: string } {
  const raw = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "messages required" };
  const messages: ChatMessage[] = [];
  for (const m of raw.slice(-20)) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if (role !== "user" && role !== "assistant") return { ok: false, error: "bad role" };
    if (typeof content !== "string" || content.length > 4000) return { ok: false, error: "bad content" };
    messages.push({ role, content });
  }
  return { ok: true, messages };
}

/**
 * Build the system prompt fresh per request — the knowledge base reads
 * from DB (KnowledgeSection rows, tenant-scoped) so admin edits take
 * effect immediately.
 */
async function buildSystemPrompt(school: SchoolPublic): Promise<string> {
  const knowledge = await buildSchoolKnowledge();
  return `You are the AI front-desk assistant for ${school.name}, a Nigerian secondary
school (${school.addressShort}). You are the first impression for every prospective
parent, current parent, alumnus, or curious visitor who reaches out via the
website. Treat every conversation like a warm, professional school office
staffer who genuinely cares about getting the family the right answer.

Your job is two things:
1. Give accurate, helpful answers grounded in the school knowledge below.
2. Move the conversation forward — ask a useful follow-up, suggest the
   next step (book a visit, fill the admission form, log in to the portal,
   call the office), or hand off to the right channel.

Knowledge base (your source of truth):

---

${knowledge}

---

Tone & style:
- Warm, conversational, professional. Like a knowledgeable receptionist.
- Use Nigerian-English phrasing comfortably (e.g. "Welcome ma/sir", "kindly",
  "thank you for reaching out") — don't be stiff or robotic.
- Concise by default. 1-3 short paragraphs. Use bullet points for lists.
- Don't over-format. A casual question deserves a casual answer; a
  detailed question deserves a structured one.
- Address the parent by their relationship to the school ("As a prospective
  parent...", "As a current parent...") when context allows.
- It's fine to be a little warm and human — "Lovely to hear from you" /
  "Great question" is welcome, but don't overdo it.

Handling rules:
- If the answer is in the knowledge base, give it directly with confidence.
- If the knowledge base doesn't cover something specific (e.g. exact
  current-term fee figures, a particular teacher's bio), say so honestly
  and offer the right channel: "I don't have that exact figure on hand —
  please call ${school.phone} or email ${school.email} and the office
  will quote it for you straight away."
- For a particular child's records (results, fees, attendance, report
  cards, WhatsApp notifications), direct them to the parent portal at
  ${school.portalUrl}/portal/login OR the school's WhatsApp number
  ${school.phoneIntl} (parents are auto-recognised by phone number on
  WhatsApp).
- For sensitive complaints, urgent matters, or emotional topics, lead
  with empathy and immediately offer phone / WhatsApp — don't try to
  resolve them via chat.
- If the user types a non-question (greetings, thanks, single words),
  match their energy. A "hi" deserves a "hello, welcome", not a lecture.

Conversation memory:
- You see the full chat history — use it. Don't ask for info already given.
- If they've mentioned a child's name or year-group earlier, remember it.

Things you must NEVER do:
- Invent fees, dates, exam pass-rates, teacher names, or any other concrete
  detail not in the knowledge base.
- Promise specific outcomes ("Your child will definitely pass JAMB").
- Discuss specific students or any private information about anyone.
- Ask for passwords, payment card details, or anything sensitive — direct
  them to the portal or the office instead.

Closing every long answer with a "Anything else I can help with?" feels
nice but skip it on short factual exchanges.`;
}

function ndjson(events: Array<Record<string, unknown>>): string {
  return events.map(e => JSON.stringify(e)).join("\n") + "\n";
}

/**
 * Produce the streaming chat response for a school. Must be called inside
 * that school's tenant context (request host or runAsSchool) because the
 * knowledge base read is tenant-scoped.
 */
export async function chatResponse(
  school: SchoolPublic,
  messages: ChatMessage[],
  extraHeaders: HeadersInit = {},
): Promise<Response> {
  const headers = { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", ...extraHeaders };

  // Graceful fallback when no API key: keyword-matched FAQ, then a
  // generic "call/email" message.
  if (!process.env.ANTHROPIC_API_KEY) {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const answer = (lastUser ? staticFaqAnswer(lastUser.content, school) : null) ?? genericFallback(school);
    return new Response(ndjson([{ type: "delta", text: answer }, { type: "end" }]), { status: 200, headers });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = await buildSystemPrompt(school);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          // Sonnet 4.5 — best reasoning + nuance per dollar for a school
          // front-desk role. Haiku is cheaper but answers feel flat.
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          system: [
            {
              type: "text",
              text: systemPrompt,
              // Cache the large, static system prompt across requests.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        });

        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "delta", text: event.delta.text }) + "\n"));
          }
        }
        controller.enqueue(encoder.encode(JSON.stringify({ type: "end" }) + "\n"));
        controller.close();
      } catch (err) {
        console.error("[website-chat] Anthropic stream failed", err);
        const msg = `Sorry, I hit a snag. Please call ${school.phone} or email ${school.email}.`;
        controller.enqueue(encoder.encode(ndjson([{ type: "delta", text: msg }, { type: "end" }])));
        controller.close();
      }
    },
  });

  return new Response(stream, { status: 200, headers });
}
