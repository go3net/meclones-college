/**
 * Tenant binding for machine-to-machine routes (the n8n WhatsApp relay
 * endpoints under /api/whatsapp/*).
 *
 * The caller names the school with an `x-school-slug` header. Without
 * it we fall back to whatever the request host resolves to, which on
 * the Railway URL is the default school, so the existing single-school
 * n8n flows keep working unchanged.
 */

import { NextRequest, NextResponse } from "next/server";
import { runAsSchool } from "./tenant-context";
import { getCurrentSchool } from "./tenant";
import { loadSchoolBySlug } from "./host";

export async function withRelaySchool<T>(
  req: NextRequest,
  fn: () => Promise<T>,
): Promise<T | NextResponse> {
  const slug = req.headers.get("x-school-slug")?.trim().toLowerCase();
  const school = slug ? await loadSchoolBySlug(slug) : await getCurrentSchool();
  if (!school) {
    return NextResponse.json({ ok: false, error: "unknown_school" }, { status: 404 });
  }
  return runAsSchool(school, fn);
}
