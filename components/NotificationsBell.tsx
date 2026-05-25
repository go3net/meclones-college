"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Megaphone, FileText, Wallet, MessageCircle, Receipt, ClipboardList, MessageSquare, Sparkles } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  ANNOUNCEMENT: Megaphone,
  RESULT_PUBLISHED: FileText,
  FEE_CHARGED: Wallet,
  PAYMENT_RECEIVED: Receipt,
  COMPLAINT_REPLIED: MessageCircle,
  ADMISSION_UPDATE: ClipboardList,
  WHATSAPP_INCOMING: MessageSquare,
  GENERIC: Sparkles,
};

const TYPE_TINT: Record<string, string> = {
  ANNOUNCEMENT: "bg-sky-100 text-sky-700",
  RESULT_PUBLISHED: "bg-emerald-100 text-emerald-700",
  FEE_CHARGED: "bg-amber-100 text-amber-700",
  PAYMENT_RECEIVED: "bg-emerald-100 text-emerald-700",
  COMPLAINT_REPLIED: "bg-rose-100 text-rose-700",
  ADMISSION_UPDATE: "bg-indigo-100 text-indigo-700",
  WHATSAPP_INCOMING: "bg-emerald-100 text-emerald-700",
  GENERIC: "bg-slate-100 text-slate-700",
};

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const refresh = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.items ?? []);
      setUnread(json.unreadCount ?? 0);
    } catch { /* network blip */ }
  };

  useEffect(() => {
    // Prefer SSE — the server pushes a fresh snapshot whenever something
    // changes (server-side poll, ~5s granularity). Falls back to a 60s
    // client poll if EventSource isn't available or keeps erroring.
    refresh();

    if (typeof EventSource === "undefined") {
      pollRef.current = window.setInterval(refresh, 60_000) as unknown as number;
      return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    }

    let es: EventSource | null = null;
    let fallbackTimer: number | null = null;
    let attempts = 0;

    const startFallback = () => {
      if (fallbackTimer) return;
      fallbackTimer = window.setInterval(refresh, 60_000) as unknown as number;
    };

    try {
      es = new EventSource("/api/notifications/stream", { withCredentials: true });

      es.addEventListener("snapshot", e => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (Array.isArray(data.items)) setItems(data.items);
          if (typeof data.unreadCount === "number") setUnread(data.unreadCount);
        } catch { /* malformed event */ }
      });

      es.onopen = () => { attempts = 0; };
      es.onerror = () => {
        // EventSource auto-reconnects, but after a few failures fall
        // back to polling so the bell doesn't go permanently silent.
        attempts++;
        if (attempts >= 3) {
          es?.close();
          es = null;
          startFallback();
        }
      };
    } catch {
      startFallback();
    }

    return () => {
      es?.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, []);

  const onOpen = async () => {
    setOpen(o => !o);
    if (!open) await refresh();
  };

  const markOne = async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(c => Math.max(0, c - 1));
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  };

  const markAll = async () => {
    setLoading(true);
    setItems(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnread(0);
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Notifications"
        className="relative p-2 rounded-lg hover:bg-slate-100"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-[18px] text-center ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lift border border-slate-100 z-40 max-h-[28rem] flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">Notifications</p>
                {unread > 0 && <span className="text-[11px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">{unread} new</span>}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  <Bell className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No notifications yet.
                </div>
              ) : (
                items.map(n => {
                  const Icon = TYPE_ICON[n.type] ?? Sparkles;
                  const tint = TYPE_TINT[n.type] ?? "bg-slate-100 text-slate-700";
                  const body = (
                    <div className={`flex gap-3 px-4 py-3 ${n.isRead ? "" : "bg-brand-50/40"}`}>
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tint}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${n.isRead ? "text-slate-700" : "font-semibold text-slate-900"} truncate`}>{n.title}</p>
                          <span className="text-[10px] text-slate-500 shrink-0">{relative(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />}
                    </div>
                  );
                  return n.href ? (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => { setOpen(false); if (!n.isRead) markOne(n.id); }}
                      className="block hover:bg-slate-50"
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { if (!n.isRead) markOne(n.id); }}
                      className="block w-full text-left hover:bg-slate-50"
                    >
                      {body}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
