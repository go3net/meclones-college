import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminComplaintsPage() {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  // For now we surface website contact-form messages here (school enquiries +
  // complaints land in the same inbox). A dedicated Complaint table can be
  // added later if the school needs separate triage.
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Complaints & Enquiries</h1>
        <p className="text-sm text-slate-500">Every message submitted through the public website contact form.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <Badge tone="neutral">{messages.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {messages.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No messages yet</p>
              <p className="text-sm text-slate-500 mt-1">Enquiries from the website contact form will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {messages.map(m => (
                <li key={m.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-brand-900">{m.name}</p>
                        {m.role && <Badge tone="info">{m.role}</Badge>}
                        {m.handledAt && <Badge tone="success">Resolved</Badge>}
                      </div>
                      <p className="text-[12px] text-slate-500">{m.email}{m.phone && ` · ${m.phone}`}</p>
                      {m.subject && <p className="mt-2 text-sm font-medium text-slate-800">{m.subject}</p>}
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{m.message}</p>
                    </div>
                    <span className="text-[11px] text-slate-500">{dateFmt.format(m.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
