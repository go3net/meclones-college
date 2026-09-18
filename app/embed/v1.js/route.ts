/**
 * GET /embed/v1.js — the embeddable widget script.
 *
 * Served from the platform so every customer site loads the same,
 * always-current code. Source lives in embed/widget.js (plain JS, no
 * build step) and is read once per process.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let cached: { body: string; etag: string } | null = null;

function load() {
  if (cached) return cached;
  const body = readFileSync(join(process.cwd(), "embed", "widget.js"), "utf8");
  const etag = `"${createHash("sha1").update(body).digest("hex").slice(0, 16)}"`;
  cached = { body, etag };
  return cached;
}

export async function GET(req: NextRequest) {
  const { body, etag } = load();
  const headers = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    "Access-Control-Allow-Origin": "*",
    "ETag": etag,
  };
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers });
  }
  return new NextResponse(body, { status: 200, headers });
}
