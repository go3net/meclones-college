import { Check, CheckCheck, ChevronLeft, Phone, Video, MoreVertical, Paperclip, Mic, Send, FileText, Image as ImageIcon } from "lucide-react";

/**
 * Flexible WhatsApp chat mockup used on /whatsapp + the sample school
 * sites. Each message is one of: text, list, buttons, attachment.
 * Uses the existing wa-bg / wa-bubble-in / wa-bubble-out classes from
 * globals.css so the bubbles look authentic.
 */

export type WhatsMsg =
  | { kind: "text"; from: "in" | "out"; text: string; time?: string }
  | { kind: "list"; from: "in"; header?: string; items: Array<{ title: string; sub?: string }>; time?: string }
  | { kind: "buttons"; from: "in"; text: string; buttons: string[]; time?: string }
  | { kind: "attachment"; from: "in" | "out"; kind2: "pdf" | "image" | "voice"; label: string; sub?: string; time?: string }
  | { kind: "system"; text: string };

export interface WhatsAppMockupProps {
  /** What the contact name reads in the WhatsApp header. */
  peerName: string;
  /** Sub-text under the contact name. Often "online" or "typing…" */
  peerStatus?: string;
  /** Single-character monogram for the avatar circle. */
  peerMonogram?: string;
  /** Avatar background colour (defaults to WhatsApp green). */
  peerAvatarColor?: string;
  /** Chat lines in order. */
  messages: WhatsMsg[];
  /** Optional title above the phone frame ("Parent pays fees", etc.). */
  caption?: string;
  /** Show the "Type a message" input footer. Defaults to true. */
  showInput?: boolean;
  /** Extra className on the outer phone frame. */
  className?: string;
}

export function WhatsAppMockup({
  peerName,
  peerStatus = "online",
  peerMonogram = "S",
  peerAvatarColor = "#075E54",
  messages,
  caption,
  showInput = true,
  className = "",
}: WhatsAppMockupProps) {
  return (
    <div className={`mx-auto ${className}`}>
      {caption && (
        <p className="text-center text-xs uppercase tracking-[0.22em] font-semibold text-slate-500 mb-3">
          {caption}
        </p>
      )}

      {/* Phone-ish frame */}
      <div className="rounded-[2rem] bg-slate-900 p-1.5 shadow-2xl ring-1 ring-black/10 max-w-[380px] mx-auto">
        <div className="rounded-[1.6rem] overflow-hidden bg-white">
          {/* WhatsApp header (real WhatsApp green: #075E54) */}
          <div className="bg-[#075E54] text-white flex items-center gap-3 px-3 py-2.5">
            <ChevronLeft className="h-5 w-5 opacity-90" />
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0"
              style={{ backgroundColor: peerAvatarColor === "#075E54" ? "#128C7E" : peerAvatarColor }}
            >
              {peerMonogram}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{peerName}</p>
              <p className="text-[10px] opacity-80 leading-tight">{peerStatus}</p>
            </div>
            <Video className="h-5 w-5 opacity-90" />
            <Phone className="h-5 w-5 opacity-90" />
            <MoreVertical className="h-5 w-5 opacity-90" />
          </div>

          {/* Chat surface */}
          <div className="wa-bg px-3 py-4 space-y-2 min-h-[420px] max-h-[520px] overflow-y-auto">
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          </div>

          {/* Input footer */}
          {showInput && (
            <div className="bg-[#F0F2F5] border-t border-slate-200 flex items-center gap-2 px-3 py-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-slate-400 flex items-center gap-2 border border-slate-200">
                <span className="flex-1">Type a message…</span>
                <Paperclip className="h-4 w-4 text-slate-400" />
              </div>
              <div className="h-9 w-9 rounded-full bg-[#075E54] flex items-center justify-center text-white shrink-0">
                <Mic className="h-4 w-4" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: WhatsMsg }) {
  if (msg.kind === "system") {
    return (
      <div className="flex justify-center my-1">
        <span className="bg-white/80 text-slate-600 text-[10px] px-3 py-1 rounded-md shadow-sm">{msg.text}</span>
      </div>
    );
  }

  const align = msg.from === "out" ? "justify-end" : "justify-start";
  const bubbleCls = msg.from === "out" ? "wa-bubble-out" : "wa-bubble-in";

  if (msg.kind === "text") {
    return (
      <div className={`flex ${align}`}>
        <div className={`${bubbleCls} max-w-[80%]`}>
          <p className="text-sm leading-snug whitespace-pre-line">{msg.text}</p>
          <p className="text-[9px] text-slate-500 text-right mt-1 flex items-center justify-end gap-0.5">
            {msg.time ?? "9:41"} {msg.from === "out" && <CheckCheck className="h-3 w-3 text-[#34B7F1]" />}
          </p>
        </div>
      </div>
    );
  }

  if (msg.kind === "list") {
    return (
      <div className={`flex ${align}`}>
        <div className={`${bubbleCls} max-w-[85%] w-full`}>
          {msg.header && <p className="text-sm font-semibold mb-2">{msg.header}</p>}
          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden bg-white">
            {msg.items.map((it, i) => (
              <div key={i} className="px-3 py-2.5 hover:bg-slate-50">
                <p className="text-sm font-medium text-slate-900">{it.title}</p>
                {it.sub && <p className="text-[11px] text-slate-500 mt-0.5">{it.sub}</p>}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 text-right mt-1.5">{msg.time ?? "9:41"}</p>
        </div>
      </div>
    );
  }

  if (msg.kind === "buttons") {
    return (
      <div className={`flex ${align}`}>
        <div className={`${bubbleCls} max-w-[85%] w-full`}>
          <p className="text-sm leading-snug whitespace-pre-line">{msg.text}</p>
          <div className="mt-2 space-y-1">
            {msg.buttons.map((b, i) => (
              <button
                key={i}
                className="w-full text-center text-sm font-semibold text-[#075E54] bg-white border-t border-slate-200 px-3 py-2 hover:bg-slate-50 first:border-t-2"
              >
                {b}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-slate-500 text-right mt-1">{msg.time ?? "9:41"}</p>
        </div>
      </div>
    );
  }

  // attachment
  const Icon = msg.kind2 === "pdf" ? FileText : msg.kind2 === "image" ? ImageIcon : Mic;
  const tint = msg.kind2 === "pdf" ? "text-rose-600 bg-rose-50" : msg.kind2 === "image" ? "text-sky-600 bg-sky-50" : "text-emerald-600 bg-emerald-50";
  return (
    <div className={`flex ${align}`}>
      <div className={`${bubbleCls} max-w-[85%]`}>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-md px-3 py-2">
          <div className={`h-10 w-10 rounded-md flex items-center justify-center ${tint}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{msg.label}</p>
            {msg.sub && <p className="text-[11px] text-slate-500 truncate">{msg.sub}</p>}
          </div>
        </div>
        <p className="text-[9px] text-slate-500 text-right mt-1 flex items-center justify-end gap-0.5">
          {msg.time ?? "9:41"} {msg.from === "out" && <CheckCheck className="h-3 w-3 text-[#34B7F1]" />}
        </p>
      </div>
    </div>
  );
}
