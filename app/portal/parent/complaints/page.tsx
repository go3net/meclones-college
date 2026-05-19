import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";
import { MessageCircle, Plus, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type SearchParams = { submitted?: string };

const statusTone: Record<string, "neutral" | "info" | "success" | "warning"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const categoryLabel: Record<string, string> = {
  ACADEMIC: "Academic",
  FEES: "Fees",
  STAFF: "Staff",
  FACILITY: "Facility",
  TRANSPORT: "Transport",
  GENERAL: "General",
  OTHER: "Other",
};

export default async function ParentComplaintsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("PARENT");
  const user = await getSessionUser();
  if (!user) return null;

  const complaints = await prisma.complaint.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    include: { handledBy: { select: { name: true } } },
    take: 50,
  });

  return (
    <PortalShell role="parent">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Complaints & Feedback</h1>
          <p className="text-sm text-slate-500">{complaints.length} complaint{complaints.length === 1 ? "" : "s"} on record</p>
        </div>
        <Link href="/portal/parent/complaints/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> New complaint
        </Link>
      </div>

      {searchParams.submitted && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Complaint submitted. The school will respond within 48 hours.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your submissions</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {complaints.length === 0 ? (
            <div className="py-12 text-center">
              <MessageCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No complaints yet</p>
              <p className="text-sm text-slate-500 mt-1">Tap "New complaint" to share feedback or report an issue.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {complaints.map(c => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-900">{c.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="neutral">{categoryLabel[c.category]}</Badge>
                        <Badge tone={statusTone[c.status]}>{c.status.replace("_", " ").toLowerCase()}</Badge>
                        <span className="text-[11px] text-slate-500">{dateFmt.format(c.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-3">{c.body}</p>
                  {c.resolutionNote && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
                      <p className="text-xs font-semibold text-emerald-700 mb-0.5">Resolution {c.handledBy && `· ${c.handledBy.name}`}</p>
                      {c.resolutionNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
