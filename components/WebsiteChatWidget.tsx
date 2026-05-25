"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Loader2 } from "lucide-react";
import { SCHOOL } from "@/lib/constants";

interface Msg { role: "user" | "assistant"; content: string; }

const QUICK_PROMPTS = [
  "How do I apply for admission?",
  "How much are the fees?",
  "Can I book a tour?",
  "What programs do you offer?",
];

const INITIAL_GREETING: Msg = {
  role: "assistant",
  content: `Hi! I'm the ${SCHOOL.shortName} virtual assistant. Ask me anything about our school — admissions, programs, fees, visits, contact, the portal. How can I help?`,
};

export function WebsiteChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-focus input when opening.
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);

    // Push an empty assistant message we stream into.
    setMessages(m => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/website-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({ message: null }));
        const fallback = errBody?.message ?? `Sorry, I hit a snag. Please call ${SCHOOL.phone}.`;
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: fallback };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep partial
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "delta" && typeof evt.text === "string") {
              acc += evt.text;
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            // Bad chunk — skip.
          }
        }
      }
    } catch (err) {
      console.error("[chat-widget] failed", err);
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `Sorry, I couldn't reach the assistant just now. Please call ${SCHOOL.phone} or email ${SCHOOL.email}.` };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {/* Floating launcher — sits above the existing WhatsApp FAB so both
          are visible. WhatsApp button is 56px + 20px bottom margin = ~76px,
          so we land at bottom-24 (96px) for a clean gap. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-5 z-50 inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-3 rounded-full shadow-lift font-semibold text-sm transition-all ring-4 ring-white"
          aria-label="Ask the school assistant"
        >
          <Sparkles className="h-4 w-4 text-gold-300" />
          <span className="hidden sm:inline">Ask the school</span>
          <MessageSquare className="h-4 w-4 sm:hidden" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 left-0 sm:bottom-5 sm:right-5 sm:left-auto z-50 sm:w-[380px] h-[80vh] sm:h-[560px] sm:max-h-[80vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col border border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-br from-brand-800 to-brand-900 text-white rounded-t-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-gold-400 text-brand-900 flex items-center justify-center font-bold shrink-0">
                M
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{SCHOOL.shortName} Assistant</p>
                <p className="text-[11px] text-gold-300 inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI-powered · usually replies instantly
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                    ? "bg-brand-700 text-white rounded-br-sm"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"}`}
                >
                  {m.content || (busy && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : "")}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts (only when conversation is short) */}
          {messages.length <= 1 && !busy && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-slate-100 bg-white">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-100"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-100 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type your question…"
                rows={1}
                disabled={busy}
                className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 min-h-[40px] max-h-[120px]"
              />
              <button
                onClick={() => send(input)}
                disabled={busy || !input.trim()}
                className="inline-flex items-center gap-1 bg-brand-700 hover:bg-brand-800 text-white px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              For your child's records, log in to the parent portal.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
