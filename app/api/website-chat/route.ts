/**
 * Public-website AI chatbot. Streams answers from Claude (Anthropic API)
 * grounded in the school's knowledge base.
 *
 * Body shape (POST):
 *   { messages: Array<{ role: "user" | "assistant", content: string }> }
 *
 * Streaming response: text/event-stream-ish — newline-delimited JSON chunks
 * each shaped { type: "delta", text: "..." } or { type: "end" }.
 *
 * Unauthenticated — this is for prospective parents / visitors. We
 * rate-limit per IP via a simple in-memory bucket (good enough for the
 * traffic a single school's site sees; upgrade to Redis if needed).
 *
 * If ANTHROPIC_API_KEY isn't set, the endpoint returns a friendly canned
 * message pointing the user to phone/email, so the widget stays useful
 * even before the key lands.
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSchoolKnowledge } from "@/lib/school-knowledge";
import { staticFaqAnswer, genericFallback } from "@/lib/school-faq";
import { SCHOOL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── In-memory rate limiter ─────────────────────────────────────────
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 12;           // 12 messages / minute / IP
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimitHit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX) return true;
  return false;
}

const SYSTEM_PROMPT = `You are the AI front-desk assistant for ${SCHOOL.name}, a Nigerian secondary
school in Lekki, Lagos. You are the first impression for every prospective
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

${buildSchoolKnowledge()}

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
  please call ${SCHOOL.phone} or email ${SCHOOL.email} and the office
  will quote it for you straight away."
- For a particular child's records (results, fees, attendance, report
  cards, WhatsApp notifications), direct them to the parent portal at
  ${SCHOOL.website}/portal/login OR the school's WhatsApp number
  ${SCHOOL.phoneIntl} (parents are auto-recognised by phone number on
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

export async function POST(req: NextRequest) {
  // Quick rate-limit check.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  if (rateLimitHit(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited", message: "Please slow down a bit — try again in a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { messages?: Array<{ role: "user" | "assistant"; content: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const messages = (body.messages ?? []).slice(-20); // keep last 20 turns
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }
  // Validate basic shape.
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") return new Response("bad role", { status: 400 });
    if (typeof m.content !== "string" || m.content.length > 4000) return new Response("bad content", { status: 400 });
  }

  // Graceful fallback when no API key: try the keyword-matched static
  // FAQ first, then a generic "call/email" message. Either way the
  // visitor gets a useful answer instead of "I'm not fully wired up".
  if (!process.env.ANTHROPIC_API_KEY) {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const answer = (lastUser ? staticFaqAnswer(lastUser.content) : null) ?? genericFallback();
    return new Response(
      JSON.stringify({ type: "delta", text: answer }) + "\n" +
      JSON.stringify({ type: "end" }) + "\n",
      { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Stream from Claude → newline-delimited JSON to the client.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          // Sonnet 4.5 — best reasoning + nuance per dollar for a
          // school front-desk role. Haiku is cheaper but answers feel
          // flat for anything beyond simple FAQs.
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 2048,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              // Cache the (large, static) system prompt across requests
              // — keeps response cost+latency low while school traffic is bursty.
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
        const msg = `Sorry, I hit a snag. Please call ${SCHOOL.phone} or email ${SCHOOL.email}.`;
        controller.enqueue(encoder.encode(JSON.stringify({ type: "delta", text: msg }) + "\n"));
        controller.enqueue(encoder.encode(JSON.stringify({ type: "end" }) + "\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
