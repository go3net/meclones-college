/**
 * POST /api/embed/chat?key=sb_…
 *
 * The AI front-desk chat for the embeddable widget on a school's own
 * website. Same body and streaming protocol as /api/website-chat, but the
 * school comes from the embed key (not the host), the origin must pass
 * the school's allowlist, and the rate limit is per school + IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { runAsSchool } from "@/lib/tenant-context";
import { toPublicSchool } from "@/lib/school-public";
import { corsHeaders, loadSchoolByEmbedKey, originAllowed } from "@/lib/embed";
import { chatResponse, clientIp, parseMessages, rateLimitHit, rateLimitedResponse } from "@/lib/website-chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  const school = await loadSchoolByEmbedKey(req.nextUrl.searchParams.get("key"));
  if (!school || !school.embedEnabled || school.status === "SUSPENDED") {
    return NextResponse.json({ error: "unknown_key" }, { status: 404, headers: cors });
  }
  if (!originAllowed(school, origin)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers: cors });
  }
  if (rateLimitHit(`embed:${school.id}:${clientIp(req)}`)) return rateLimitedResponse(cors);

  const parsed = parseMessages(await req.json().catch(() => null));
  if (!parsed.ok) return new Response(parsed.error, { status: 400, headers: cors });

  return runAsSchool(school, () => chatResponse(toPublicSchool(school), parsed.messages, cors));
}
