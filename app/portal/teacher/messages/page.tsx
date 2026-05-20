import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/auth-helpers";
import { MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function TeacherMessagesPage() {
  const teacher = await getCurrentTeacher();

  const threads = await prisma.messageThread.findMany({
    where: { teacherId: teacher.id },
    include: {
      parent: { include: { user: { select: { name: true, image: true } } } },
      student: { include: { user: { select: { name: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  const unreadTotal = threads.reduce((s, t) => s + t.teacherUnread, 0);

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Messages</h1>
        <p className="text-sm text-slate-500">
          {threads.length} conversation{threads.length === 1 ? "" : "s"} with parents
          {unreadTotal > 0 && <> · <strong className="text-rose-700">{unreadTotal} unread</strong></>}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Parent conversations</CardTitle></CardHeader>
        <CardBody className="p-0">
          {threads.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No conversations yet</p>
              <p className="text-sm text-slate-500 mt-1">Parents can message you from their portal.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {threads.map(t => {
                const last = t.messages[0];
                const initials = t.parent.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <Link key={t.id} href={`/portal/teacher/messages/${t.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0">
                      {t.parent.user.image ? <img src={t.parent.user.image} alt={t.parent.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${t.teacherUnread > 0 ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                          {t.parent.user.name}
                        </p>
                        <span className="text-[11px] text-slate-500 shrink-0">{dateFmt.format(t.lastMessageAt)}</span>
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {t.subject}{t.student && ` · about ${t.student.user.name}`}
                      </p>
                      {last && <p className="text-xs text-slate-600 mt-1 line-clamp-1">{last.body}</p>}
                    </div>
                    {t.teacherUnread > 0 && (
                      <span className="h-5 min-w-[20px] rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center px-1.5 shrink-0">{t.teacherUnread}</span>
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
