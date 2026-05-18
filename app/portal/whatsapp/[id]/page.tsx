import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function WhatsAppConversationPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"]);

  const session = await prisma.whatsAppSession.findUnique({
    where: { id: params.id },
    include: {
      student: { include: { user: { select: { name: true } }, classRef: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) notFound();

  const studentName = session.student?.user.name ?? "(unverified)";
  const className = session.student?.classRef ? `${session.student.classRef.name}${session.student.classRef.arm}` : null;

  return (
    <PortalShell role="school_admin">
      <Link href="/portal/whatsapp" className="inline-flex items-center gap-1 text-sm text-brand-700 mb-4 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to conversations
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">{studentName}</h1>
          <div className="mt-1 flex items-center gap-2 flex-wrap text-sm text-slate-500">
            <span className="font-mono">{session.phoneNumber}</span>
            {session.admissionNumber && <span>· Adm: <span className="font-mono">{session.admissionNumber}</span></span>}
            {className && <Badge tone="neutral">{className}</Badge>}
            {session.isEscalated && !session.resolvedAt && (
              <Badge tone="warning"><AlertCircle className="h-3 w-3" /> Escalated</Badge>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <p>Started {dateTimeFmt.format(session.createdAt)}</p>
          <p>Last activity {dateTimeFmt.format(session.lastActivity)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages ({session.messages.length})</CardTitle>
        </CardHeader>
        <CardBody className="wa-bg p-4 space-y-2">
          {session.messages.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">No messages yet.</p>
          ) : (
            session.messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === "IN" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] ${m.direction === "IN" ? "wa-bubble-in" : "wa-bubble-out"}`}>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p className="text-[10px] text-slate-500 mt-1 text-right">{dateTimeFmt.format(m.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
