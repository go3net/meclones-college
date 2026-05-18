import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { MessageCircle, AlertCircle, Smartphone } from "lucide-react";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function WhatsAppLogsPage() {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"]);

  const [sessions, totalSessions, escalatedCount, totalMessages] = await Promise.all([
    prisma.whatsAppSession.findMany({
      orderBy: { lastActivity: "desc" },
      take: 50,
      include: {
        student: { include: { user: { select: { name: true } }, classRef: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 3 },
        _count: { select: { messages: true } },
      },
    }),
    prisma.whatsAppSession.count(),
    prisma.whatsAppSession.count({ where: { isEscalated: true, resolvedAt: null } }),
    prisma.whatsAppMessage.count(),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">WhatsApp Conversations</h1>
        <p className="text-sm text-slate-500">Parent self-service via the school WhatsApp bot.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Sessions</p>
                <p className="text-xl font-bold text-brand-900">{totalSessions}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Messages</p>
                <p className="text-xl font-bold text-brand-900">{totalMessages}</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card className={escalatedCount > 0 ? "ring-1 ring-amber-200" : ""}>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Escalated</p>
                <p className="text-xl font-bold text-brand-900">{escalatedCount}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent conversations</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {sessions.length === 0 ? (
            <div className="py-16 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No conversations yet</p>
              <p className="text-sm text-slate-500 mt-1">When parents message the school WhatsApp number, threads appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map(s => {
                const studentName = s.student?.user.name ?? "(unverified)";
                const className = s.student?.classRef ? `${s.student.classRef.name}${s.student.classRef.arm}` : null;
                const lastMsg = s.messages[0];
                return (
                  <li key={s.id}>
                    <Link href={`/portal/whatsapp/${s.id}`} className="block px-4 py-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-brand-900">{studentName}</p>
                            {className && <Badge tone="neutral">{className}</Badge>}
                            {s.isEscalated && !s.resolvedAt && <Badge tone="warning">Escalated</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{s.phoneNumber}{s.admissionNumber && ` · ${s.admissionNumber}`}</p>
                          {lastMsg && (
                            <p className={`mt-2 text-sm line-clamp-2 ${lastMsg.direction === "IN" ? "text-slate-700" : "text-slate-500"}`}>
                              <span className="text-[11px] font-semibold text-slate-400 mr-1.5 uppercase">{lastMsg.direction === "IN" ? "Parent" : "Bot"}:</span>
                              {lastMsg.content}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <p>{dateTimeFmt.format(s.lastActivity)}</p>
                          <p className="mt-0.5">{s._count.messages} msg{s._count.messages === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
