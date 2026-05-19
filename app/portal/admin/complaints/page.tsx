import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, Badge, Button, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { setComplaintStatus } from "./actions";
import { MessageCircle, Clock, CheckCircle2, X, Inbox } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

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

type SearchParams = { status?: string };

export default async function AdminComplaintsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const statusFilter = (searchParams.status ?? "OPEN").toUpperCase();
  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "ALL"];
  const useStatus = validStatuses.includes(statusFilter) ? statusFilter : "OPEN";

  const where = useStatus === "ALL" ? {} : { status: useStatus as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" };

  const [complaints, byStatus] = await Promise.all([
    prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, email: true } }, handledBy: { select: { name: true } } },
      take: 100,
    }),
    prisma.complaint.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const counts = byStatus.reduce((acc, r) => { acc[r.status] = r._count.status; return acc; }, {} as Record<string, number>);
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Complaints & Feedback</h1>
        <p className="text-sm text-slate-500">Every complaint submitted by parents or staff.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Open" value={counts.OPEN ?? 0} accent="sky" icon={<Inbox className="h-5 w-5" />} />
        <StatCard label="In Progress" value={counts.IN_PROGRESS ?? 0} accent="amber" icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Resolved" value={counts.RESOLVED ?? 0} accent="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Closed" value={counts.CLOSED ?? 0} accent="brand" icon={<X className="h-5 w-5" />} />
        <StatCard label="Total" value={total} accent="gold" icon={<MessageCircle className="h-5 w-5" />} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ["OPEN", "Open"], ["IN_PROGRESS", "In progress"], ["RESOLVED", "Resolved"], ["CLOSED", "Closed"], ["ALL", "All"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/portal/admin/complaints?status=${key}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${useStatus === key ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {complaints.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <MessageCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No complaints match this filter</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {complaints.map(c => (
            <Card key={c.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-brand-900">{c.subject}</h3>
                      <Badge tone="neutral">{categoryLabel[c.category]}</Badge>
                      <Badge tone={statusTone[c.status]}>{c.status.replace("_", " ").toLowerCase()}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.authorName}{c.authorEmail && ` · ${c.authorEmail}`}{c.authorPhone && ` · ${c.authorPhone}`} · {dateFmt.format(c.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                    {c.resolutionNote && (
                      <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
                        <p className="text-xs font-semibold text-emerald-700 mb-0.5">Resolution {c.handledBy && `· ${c.handledBy.name}`}{c.resolvedAt && ` · ${dateFmt.format(c.resolvedAt)}`}</p>
                        {c.resolutionNote}
                      </div>
                    )}
                  </div>
                </div>

                {c.status !== "CLOSED" && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    {c.status === "OPEN" && (
                      <form action={setComplaintStatus}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value="IN_PROGRESS" />
                        <Button type="submit" variant="outline" className="text-xs"><Clock className="h-3 w-3" /> Start working</Button>
                      </form>
                    )}
                    {c.status !== "RESOLVED" && (
                      <form action={setComplaintStatus} className="flex items-center gap-2 flex-1 min-w-[260px]">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value="RESOLVED" />
                        <input
                          name="resolutionNote"
                          required
                          placeholder="Resolution note for the parent"
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                        <Button type="submit" variant="gold" className="text-xs whitespace-nowrap"><CheckCircle2 className="h-3 w-3" /> Resolve</Button>
                      </form>
                    )}
                    {c.status === "RESOLVED" && (
                      <form action={setComplaintStatus}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value="CLOSED" />
                        <Button type="submit" variant="outline" className="text-xs"><X className="h-3 w-3" /> Close ticket</Button>
                      </form>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
