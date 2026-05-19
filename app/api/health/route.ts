import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Lightweight liveness probe for uptime monitors (UptimeRobot, BetterStack,
 * Railway health checks, etc.) and to keep the Railway hobby-plan container
 * from sleeping on idle.
 *
 * Returns:
 *  - 200 with `{ status: "ok", db: "ok", uptime, ts }` on success
 *  - 503 with `{ status: "degraded", db: "down", error }` if Postgres is
 *    unreachable
 *
 * Sets `Cache-Control: no-store` so monitors always hit the origin.
 */
export async function GET() {
  const start = Date.now();
  let dbStatus: "ok" | "down" = "ok";
  let dbError: string | undefined;
  let dbLatencyMs = 0;

  try {
    const t0 = Date.now();
    // Cheapest possible ping — no table touched.
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = "down";
    dbError = err instanceof Error ? err.message : String(err);
  }

  const body = {
    status: dbStatus === "ok" ? "ok" : "degraded",
    db: dbStatus,
    dbLatencyMs,
    totalMs: Date.now() - start,
    uptimeSec: Math.round(process.uptime()),
    ts: new Date().toISOString(),
    ...(dbError ? { error: dbError } : {}),
  };

  return NextResponse.json(body, {
    status: dbStatus === "ok" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

/** HEAD request — same status code, no body. Most uptime monitors use this. */
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
