import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { MessageSquare, Plus, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function ParentMessagesPage() {
  const parent = await getCurrentParentWithChildren();

  const threads = await prisma.messageThread.findMany({
    where: { parentId: parent.id },
    include: {
      teacher: { include: { user: { select: { name: true, image: true } } } },
      student: { include: { user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const unreadTotal = threads.reduce((s, t) => s + t.parentUnread, 0);

  return (
    <PortalShell role="parent">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Messages</h1>
          <p className="text-sm text-slate-500">
            {threads.length} conversation{threads.length === 1 ? "" : "s"}
            {unreadTotal > 0 && <> · <strong className="text-rose-700">{unreadTotal} unread</strong></>}
          </p>
        </div>
        <Link href="/portal/parent/messages/new">
          <Button variant="gold"><Plus className="h-4 w-4" /> New message</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Conversations with teachers</CardTitle></CardHeader>
        <CardBody className="p-0">
          {threads.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No messages yet</p>
              <p className="text-sm text-slate-500 mt-1">Click "New message" to reach out to one of your child's teachers.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {threads.map(t => {
                const last = t.messages[0];
                const initials = t.teacher.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <Link key={t.id} href={`/portal/parent/messages/${t.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0">
                      {t.teacher.user.image ? <img src={t.teacher.user.image} alt={t.teacher.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${t.parentUnread > 0 ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                          {t.teacher.user.name}
                        </p>
                        <span className="text-[11px] text-slate-500 shrink-0">{dateFmt.format(t.lastMessageAt)}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {t.subject}{t.student && ` · about ${t.student.user.name}`}
                      </p>
                      {last && <p className="text-xs text-slate-600 mt-1 line-clamp-1">{last.body}</p>}
                    </div>
                    {t.parentUnread > 0 && (
                      <span className="h-5 min-w-[20px] rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center px-1.5 shrink-0">{t.parentUnread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
