/**
 * Public-website AI chatbot for the school's own site (same origin).
 * The shared implementation lives in lib/website-chat.ts; the embeddable
 * widget on third-party sites uses /api/embed/chat with the same protocol.
 *
 * Body shape (POST): { messages: Array<{ role: "user" | "assistant", content: string }> }
 * Response: newline-delimited JSON { type: "delta", text } … { type: "end" }
 */

import { NextRequest } from "next/server";
import { getSchoolPublic } from "@/lib/tenant";
import { chatResponse, clientIp, parseMessages, rateLimitHit, rateLimitedResponse } from "@/lib/website-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (rateLimitHit("site:" + clientIp(req))) return rateLimitedResponse();

  const parsed = parseMessages(await req.json().catch(() => null));
  if (!parsed.ok) return new Response(parsed.error, { status: 400 });

  const school = await getSchoolPublic();
  return chatResponse(school, parsed.messages);
}
