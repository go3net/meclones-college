import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea } from "@/components/ui";
import { sendReply } from "@/app/portal/messages/actions";
import { Send } from "lucide-react";

interface MessageItem {
  id: string;
  authorId: string;
  body: string;
  createdAt: Date;
  authorName: string;
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
  messages: MessageItem[];
}

const timeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export function ThreadView({ threadId, subject, counterpartName, studentLabel, currentUserId, messages }: Props) {
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
        ) : messages.map(m => {
          const mine = m.authorId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine
                ? "bg-brand-700 text-white rounded-br-sm"
                : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-brand-200" : "text-slate-400"}`}>
                  {mine ? "You" : m.authorName} · {timeFmt.format(m.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </CardBody>

      <div className="border-t border-slate-100 bg-white p-3">
        <form action={sendReply} className="flex items-end gap-2">
          <input type="hidden" name="threadId" value={threadId} />
          <Textarea
            name="body"
            required
            placeholder="Write a reply…"
            className="flex-1 min-h-[44px] resize-none"
            rows={2}
          />
          <Button type="submit" variant="gold"><Send className="h-4 w-4" /> Send</Button>
        </form>
      </div>
    </Card>
  );
}
