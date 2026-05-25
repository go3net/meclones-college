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

const SYSTEM_PROMPT = `You are the friendly AI front-desk assistant for ${SCHOOL.name},
a Nigerian secondary school. Answer questions from prospective parents and
website visitors warmly and concisely — like a helpful, professional school
office staffer would.

Below is your knowledge base about the school. Use it to ground every answer.

---

${buildSchoolKnowledge()}

---

Style:
- Warm but professional. Use Nigerian-friendly phrasing.
- Be concise. 1-3 short paragraphs is plenty. Use bullet points where helpful.
- If the answer is in the knowledge above, give it directly.
- If not, say "I'm not sure — please call ${SCHOOL.phone} or email ${SCHOOL.email}"
  rather than guessing.
- For specific records (a particular child's results, fees, attendance), say
  parents need to use the portal at ${SCHOOL.website}/portal/login or message
  the school's WhatsApp number (${SCHOOL.phoneIntl}).`;

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
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
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
