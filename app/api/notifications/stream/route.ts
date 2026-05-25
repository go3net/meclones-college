/**
 * Server-Sent Events stream for the notifications bell. Replaces the
 * 60-second client-side poll with a long-lived HTTP stream that pushes
 * a fresh snapshot whenever something changes server-side.
 *
 * Implementation: the server polls the DB every 5 seconds and pushes
 * `event: snapshot` if anything has changed since the last push. A
 * `heartbeat` event every ~25s keeps reverse-proxies from killing the
 * connection. Closing the browser tab aborts the request signal which
 * tears down the interval.
 *
 * Why poll on the server rather than client?
 *  - Browser sees updates as fast as a 5s poll without re-rendering
 *  - One open connection per tab vs a fresh request every 60s
 *  - Easy to ship — no broker, no LISTEN/NOTIFY, no multi-instance gotchas
 *  - Falls back gracefully: if EventSource fails, the bell reverts to
 *    its existing polling refresh.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

async function fetchSnapshot(userId: string) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { items, unreadCount };
}

/** Stable hash over the snapshot so we only push on actual change. */
function snapshotHash(snap: { items: { id: string; isRead: boolean }[]; unreadCount: number }): string {
  return `${snap.unreadCount}:${snap.items.length}:${snap.items.map(i => `${i.id}-${i.isRead ? "1" : "0"}`).join(",")}`;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const enc = new TextEncoder();
  let lastHash = "";
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (chunk: Uint8Array) => {
        try { controller.enqueue(chunk); } catch { /* already closed */ }
      };
      const send = (event: string, data: unknown) => {
        safeEnqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const sendComment = (text: string) => {
        safeEnqueue(enc.encode(`: ${text}\n\n`));
      };

      // Initial snapshot.
      try {
        const snap = await fetchSnapshot(user.id);
        lastHash = snapshotHash(snap);
        send("snapshot", snap);
      } catch (err) {
        console.error("[notifications/stream] initial snapshot failed", err);
      }

      // Periodic check.
      pollTimer = setInterval(async () => {
        try {
          const snap = await fetchSnapshot(user.id);
          const hash = snapshotHash(snap);
          if (hash !== lastHash) {
            lastHash = hash;
            send("snapshot", snap);
          }
        } catch (err) {
          console.error("[notifications/stream] poll failed", err);
        }
      }, POLL_INTERVAL_MS);

      // Keep-alive ping — important for reverse-proxies / corporate WiFi
      // that kill idle streams.
      heartbeatTimer = setInterval(() => sendComment("ping"), HEARTBEAT_INTERVAL_MS);
    },
    cancel() {
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  // The Web Streams cancel() handler fires when the consumer aborts;
  // also wire the request signal so we definitely clean up timers.
  req.signal.addEventListener("abort", () => {
    if (pollTimer) clearInterval(pollTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
