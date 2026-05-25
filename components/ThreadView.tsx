"use client";

import { useRef } from "react";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea } from "@/components/ui";
import { sendReply } from "@/app/portal/messages/actions";
import { AttachmentPicker, AttachmentChip } from "@/components/AttachmentPicker";
import { Send, CheckCheck } from "lucide-react";

interface MessageItem {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  authorName: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
}

interface Props {
  threadId: string;
  /** Subject line for the header. */
  subject: string;
  /** Who the other party is — used in the header above the messages. */
  counterpartName: string;
  /** "About <student name>" line, if the thread is student-scoped. */
  studentLabel?: string | null;
  /** Current user's id — used to decide message alignment + style. */
  currentUserId: string;
  /** When the *other* side last opened this thread. Drives the Seen indicator. */
  peerLastReadAt?: Date | null;
  messages: MessageItem[];
}

const timeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const seenFmt = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });

export function ThreadView({ threadId, subject, counterpartName, studentLabel, currentUserId, peerLastReadAt, messages }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  // Index of the LAST own-message that the peer has already seen. We only
  // render "Seen" once, on that bubble — putting it on every read message
  // would clutter the thread without adding information.
  let lastOwnSeenIdx = -1;
  if (peerLastReadAt) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.authorId === currentUserId && m.createdAt <= peerLastReadAt) {
        lastOwnSeenIdx = i;
        break;
      }
    }
  }

  return (
    <Card className="flex flex-col" style={{ minHeight: "60vh" }}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{subject}</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            with <strong className="text-brand-900">{counterpartName}</strong>
            {studentLabel && <> · about {studentLabel}</>}
          </p>
        </div>
        <Badge tone="neutral">{messages.length} message{messages.length === 1 ? "" : "s"}</Badge>
      </CardHeader>

      <CardBody className="flex-1 overflow-y-auto space-y-3 bg-slate-50">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-500 py-10">No messages yet — be the first to write.</p>
        ) : messages.map((m, idx) => {
          const mine = m.authorId === currentUserId;
          const showSeen = mine && idx === lastOwnSeenIdx && peerLastReadAt;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine
                ? "bg-brand-700 text-white rounded-br-sm"
                : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}
              >
                {m.body && <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>}
                {m.attachmentUrl && (
                  <AttachmentChip
                    url={m.attachmentUrl}
                    name={m.attachmentName ?? "Attachment"}
                    mime={m.attachmentMime}
                    size={m.attachmentSize}
                    mine={mine}
                  />
                )}
                <p className={`text-[10px] mt-1 ${mine ? "text-brand-200" : "text-slate-400"}`}>
                  {mine ? "You" : m.authorName} · {timeFmt.format(m.createdAt)}
                </p>
              </div>
              {showSeen && (
                <p className="text-[10px] text-slate-400 mt-1 mr-1 inline-flex items-center gap-1">
                  <CheckCheck className="h-3 w-3 text-emerald-600" />
                  Seen {seenFmt.format(peerLastReadAt!)}
                </p>
              )}
            </div>
          );
        })}
      </CardBody>

      <div className="border-t border-slate-100 bg-white p-3">
        <form
          ref={formRef}
          action={async (fd: FormData) => {
            await sendReply(fd);
            formRef.current?.reset();
          }}
          className="space-y-2"
        >
          <input type="hidden" name="threadId" value={threadId} />
          <div className="flex items-end gap-2">
            <Textarea
              name="body"
              placeholder="Write a reply…"
              className="flex-1 min-h-[44px] resize-none"
              rows={2}
            />
            <Button type="submit" variant="gold"><Send className="h-4 w-4" /> Send</Button>
          </div>
          <AttachmentPicker namePrefix="attachment" compact />
        </form>
      </div>
    </Card>
  );
}
