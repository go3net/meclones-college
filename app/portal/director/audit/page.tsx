import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ScrollText, Search } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "medium" });

type SearchParams = { q?: string; action?: string; actor?: string };

const ACTION_GROUP: Record<string, "info" | "warning" | "success" | "danger" | "neutral" | "gold"> = {
  "user.password_reset": "warning",
  "user.activate": "success",
  "user.deactivate": "danger",
  "session.rotate": "gold",
  "result.publish": "success",
  "result.unpublish": "warning",
  "announcement.publish": "info",
  "announcement.delete": "danger",
  "permission.grant": "success",
  "permission.revoke": "warning",
};

function actionTone(action: string) {
  return ACTION_GROUP[action] ?? "neutral";
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const q = (searchParams.q ?? "").trim();
  const actionFilter = (searchParams.action ?? "").trim();
  const actorFilter = (searchParams.actor ?? "").trim();

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = { contains: actionFilter };
  if (actorFilter) where.actorEmail = { contains: actorFilter, mode: "insensitive" };
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
      { targetType: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q, mode: "insensitive" } },
    ];
  }

  const [logs, totalEntries, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.auditLog.count(),
    prisma.auditLog.groupBy({ by: ["action"], _count: { action: true }, orderBy: { _count: { action: "desc" } }, take: 12 }),
  ]);

  return (
    <PortalShell role="director">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Audit Log</h1>
        <p className="text-sm text-slate-500">Immutable trail of every sensitive action taken in the portal. Useful for accountability + compliance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total events" value={totalEntries} icon={<ScrollText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Distinct actions" value={distinctActions.length} accent="sky" />
        <StatCard label="Showing" value={logs.length} accent="amber" />
        <StatCard label="Storage" value="Append-only" accent="emerald" />
      </div>

      {distinctActions.length > 0 && (
        <Card className="mb-4">
          <CardHeader><CardTitle>Top actions</CardTitle></CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {distinctActions.map(d => (
                <Link
                  key={d.action}
                  href={`/portal/director/audit?action=${encodeURIComponent(d.action)}`}
                  className={`text-xs font-medium rounded-full px-2.5 py-1 ${actionFilter === d.action ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  {d.action} <span className={actionFilter === d.action ? "text-brand-100" : "text-slate-500"}>· {d._count.action}</span>
                </Link>
              ))}
              {actionFilter && (
                <Link href="/portal/director/audit" className="text-xs font-medium text-slate-500 hover:underline px-2 py-1">Clear filter</Link>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mb-4">
        <CardBody className="py-3">
          <form action="/portal/director/audit" method="GET" className="flex items-center gap-2">
            {actionFilter && <input type="hidden" name="action" value={actionFilter} />}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search action, actor, target..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Search</button>
            {(q || actorFilter) && <Link href={`/portal/director/audit${actionFilter ? `?action=${encodeURIComponent(actionFilter)}` : ""}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Clear</Link>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit entries ({logs.length})</CardTitle></CardHeader>
        <CardBody className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No audit entries match.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">When</th>
                    <th className="text-left px-4 py-2.5 font-medium">Actor</th>
                    <th className="text-left px-4 py-2.5 font-medium">Action</th>
                    <th className="text-left px-4 py-2.5 font-medium">Target</th>
                    <th className="text-left px-4 py-2.5 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 text-[12px] whitespace-nowrap">{dateFmt.format(l.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{l.actorName ?? "—"}</div>
                        <div className="text-[11px] text-slate-500">{l.actorEmail ?? ""}{l.actorRole && ` · ${l.actorRole.toLowerCase()}`}</div>
                      </td>
                      <td className="px-4 py-2.5"><Badge tone={actionTone(l.action)}>{l.action}</Badge></td>
                      <td className="px-4 py-2.5 text-[12px] text-slate-600">
                        {l.targetType && <div>{l.targetType}</div>}
                        {l.targetId && <div className="font-mono text-[10px] text-slate-400">{l.targetId}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600 max-w-md truncate">
                        {l.metadata ? <code className="font-mono">{JSON.stringify(l.metadata)}</code> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
