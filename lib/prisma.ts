import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Append connection-pool params to the DATABASE_URL so Prisma reuses
 * connections instead of opening a fresh one per request. Railway's hobby
 * Postgres doesn't ship with pgbouncer, but Prisma's own pool helps a lot.
 *
 * connection_limit=5  — small pool keeps Postgres happy on the free tier
 * pool_timeout=20     — wait up to 20s for a free slot before failing
 * connect_timeout=10  — fail fast on initial network problems
 */
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "10");
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrisma() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: { db: { url: buildDatabaseUrl() ?? "" } },
  });

  // Warm the pool so the first user-facing query isn't waiting on a TCP
  // handshake + auth round-trip. Fire-and-forget. Skip during `next build`
  // (NEXT_PHASE=phase-production-build) — the build container doesn't have
  // network access to Railway Postgres and the noisy errors aren't useful.
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    client.$connect().catch(err => console.error("[prisma] warm-up failed", err));
  }

  return client;
}

export const prisma = global.__prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
