import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import {
  ArrowLeft, Shield, TrendingUp, AlertTriangle, CheckCircle2, Users,
  ClipboardList, Calendar, Filter, Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const monthFmt = new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit" });

type SearchParams = { scope?: "term" | "session" | "all" };

export default async function DisciplineStatsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term, session } = await getActiveContext();
  const scope = searchParams.scope ?? "term";

  // ─── Build the time window based on scope ──────────────────────────
  let windowStart: Date | null = null;
  let windowLabel = "All time";
  if (scope === "term" && term?.startDate) {
    windowStart = term.startDate;
    windowLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term${session ? ` ${session.name}` : ""}`;
  } else if (scope === "term" && term && !term.startDate) {
    // No date set; coarse fallback: last 90 days.
    const d = new Date(); d.setDate(d.getDate() - 90); d.setHours(0, 0, 0, 0);
    windowStart = d;
    windowLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term (approx. last 90 days)`;
  } else if (scope === "session" && session?.startDate) {
    windowStart = session.startDate;
    windowLabel = `Session ${session.name}`;
  } else if (scope === "session" && session && !session.startDate) {
    const d = new Date(); d.setMonth(d.getMonth() - 12); d.setHours(0, 0, 0, 0);
    windowStart = d;
    windowLabel = `Session ${session.name} (approx. last 12 months)`;
  }

  const where = windowStart ? { createdAt: { gte: windowStart } } : {};

  // ─── Parallel queries ──────────────────────────────────────────────
  const [
    cases, statusCounts, severityCounts, categoryCounts, sanctionCounts,
    perClassRaw, allClasses, monthlyRaw, recurringRaw,
  ] = await Promise.all([
    prisma.disciplinaryCase.findMany({
      where,
      select: {
        id: true, createdAt: true, resolvedAt: true, status: true,
        severity: true, category: true, sanction: true, parentAcknowledged: true,
      },
    }),
    prisma.disciplinaryCase.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.disciplinaryCase.groupBy({
      by: ["severity"],
      where,
      _count: { _all: true },
    }),
    prisma.disciplinaryCase.groupBy({
      by: ["category"],
      where,
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.disciplinaryCase.groupBy({
      by: ["sanction"],
      where,
      _count: { _all: true },
      orderBy: { _count: { sanction: "desc" } },
    }),
    prisma.disciplinaryCase.findMany({
      where,
      select: { student: { select: { classId: true } } },
    }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }], select: { id: true, name: true, arm: true, _count: { select: { students: true } } } }),
    // 6-month case histogram by month-bucket.
    (async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);
      return prisma.disciplinaryCase.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, severity: true },
        orderBy: { createdAt: "asc" },
      });
    })(),
    // Recurring offenders.
    prisma.disciplinaryCase.groupBy({
      by: ["studentId"],
      where,
      _count: { _all: true },
      having: { studentId: { _count: { gt: 1 } } },
      orderBy: { _count: { studentId: "desc" } },
      take: 15,
    }),
  ]);

  const total = cases.length;
  const resolved = cases.filter(c => c.status === "RESOLVED").length;
  const open = total - resolved;
  const severe = cases.filter(c => c.severity === "MAJOR" || c.severity === "SEVERE").length;
  const acknowledged = cases.filter(c => c.parentAcknowledged).length;

  // Average days-to-resolution (only counts cases that have been resolved).
  const resolvedCases = cases.filter(c => c.resolvedAt && c.createdAt);
  const avgResolutionDays = resolvedCases.length > 0
    ? Math.round(
        resolvedCases.reduce((s, c) => s + (c.resolvedAt!.getTime() - c.createdAt.getTime()), 0)
        / resolvedCases.length
        / (1000 * 60 * 60 * 24)
      )
    : null;

  // Per-class aggregation.
  const perClassMap = new Map<string, number>();
  for (const c of perClassRaw) {
    const k = c.student.classId ?? "unassigned";
    perClassMap.set(k, (perClassMap.get(k) ?? 0) + 1);
  }
  const classLabel = new Map(allClasses.map(c => [c.id, { label: `${c.name}${c.arm}`, students: c._count.students }]));
  const perClass = Array.from(perClassMap.entries())
    .map(([id, count]) => {
      const meta = classLabel.get(id);
      const students = meta?.students ?? 0;
      return {
        classId: id,
        label: meta?.label ?? "Unassigned",
        count,
        students,
        ratePer10: students > 0 ? Math.round((count / students) * 10 * 10) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Monthly histogram for the last 6 months.
  const monthlyBuckets = new Map<string, { total: number; severe: number; label: string; date: Date }>();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyBuckets.set(key, { total: 0, severe: 0, label: monthFmt.format(d), date: new Date(d) });
  }
  for (const c of monthlyRaw) {
    const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const b = monthlyBuckets.get(key);
    if (!b) continue;
    b.total++;
    if (c.severity === "MAJOR" || c.severity === "SEVERE") b.severe++;
  }
  const monthly = Array.from(monthlyBuckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const maxMonth = Math.max(...monthly.map(m => m.total), 1);

  // Recurring offenders (hydrate student names).
  const offenderStudentIds = recurringRaw.map(r => r.studentId);
  const offenderStudents = offenderStudentIds.length > 0
    ? await prisma.student.findMany({
        where: { id: { in: offenderStudentIds } },
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
        },
      })
    : [];
  const recurring = recurringRaw.map(r => {
    const s = offenderStudents.find(x => x.id === r.studentId);
    return {
      studentId: r.studentId,
      count: r._count._all,
      name: s?.user.name ?? "—",
      admissionNumber: s?.admissionNumber ?? "",
      className: s?.classRef ? `${s.classRef.name}${s.classRef.arm}` : "—",
    };
  });

  // Sort statusCounts for predictable rendering.
  const STATUS_ORDER = ["OPEN", "AWAITING_ACK", "APPEALED", "ESCALATED", "RESOLVED"];
  const statusRows = STATUS_ORDER.map(s => {
    const row = statusCounts.find(r => r.status === s);
    return { status: s, count: row?._count._all ?? 0 };
  });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/admin/discipline" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Discipline analytics
            </p>
            <h1 className="text-2xl font-bold text-brand-900">Disciplinary statistics</h1>
            <p className="text-sm text-slate-500">
              Trends, recurring offenders, per-class hot spots, and sanction outcomes — for <strong>{windowLabel}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Scope filter */}
      <Card className="mb-4">
        <CardBody className="py-3">
          <form method="GET" className="flex flex-wrap items-center gap-3 text-sm">
            <Filter className="h-4 w-4 text-slate-400" />
            <label className="text-slate-600">Time scope:</label>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {(["term", "session", "all"] as const).map(s => (
                <Link
                  key={s}
                  href={`/portal/admin/discipline/stats?scope=${s}`}
                  className={`px-3 py-1.5 text-sm ${scope === s ? "bg-brand-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {s === "term" ? "Current term" : s === "session" ? "Current session" : "All time"}
                </Link>
              ))}
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total cases" value={total} icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard
          label="Open"
          value={open}
          hint={total > 0 ? `${Math.round((open / total) * 100)}% of total` : ""}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={open > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Resolved"
          value={resolved}
          hint={total > 0 ? `${Math.round((resolved / total) * 100)}% closed` : ""}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Avg time to resolve"
          value={avgResolutionDays !== null ? `${avgResolutionDays}d` : "—"}
          hint={`${resolvedCases.length} resolved`}
          icon={<Clock className="h-5 w-5" />}
          accent="sky"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Major / severe" value={severe} hint={total > 0 ? `${Math.round((severe / total) * 100)}% of total` : ""} accent="rose" />
        <StatCard label="Parent ack'd" value={acknowledged} hint={total > 0 ? `${Math.round((acknowledged / total) * 100)}% of total` : ""} accent="info" />
        <StatCard label="Recurring offenders" value={recurring.length} hint="≥2 cases" accent="amber" />
        <StatCard label="Classes affected" value={perClass.length} accent="brand" />
      </div>

      {/* Monthly trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle><TrendingUp className="h-4 w-4 inline mr-1" /> Cases over the last 6 months</CardTitle>
          <Badge tone="neutral">{monthlyRaw.length} total</Badge>
        </CardHeader>
        <CardBody>
          {monthlyRaw.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No cases logged in the last 6 months.</p>
          ) : (
            <div className="flex items-end gap-2 h-40 px-2">
              {monthly.map(m => {
                const pct = (m.total / maxMonth) * 100;
                const severePct = m.total > 0 ? (m.severe / m.total) * pct : 0;
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700">{m.total || ""}</div>
                    <div className="w-full bg-slate-100 rounded-t relative" style={{ height: `${pct}%`, minHeight: m.total > 0 ? "4px" : 0 }}>
                      <div className="bg-brand-500 rounded-t absolute inset-0" />
                      {severePct > 0 && (
                        <div className="bg-rose-500 rounded-t absolute inset-x-0 bottom-0" style={{ height: `${(m.severe / m.total) * 100}%` }} />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{m.label}</div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-3 bg-brand-500 rounded" /> All cases</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-3 bg-rose-500 rounded" /> Major/severe</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* By status + severity */}
        <Card>
          <CardHeader><CardTitle>Status &amp; severity</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">By status</p>
                <div className="space-y-1">
                  {statusRows.map(r => (
                    <div key={r.status} className="flex items-center justify-between gap-2">
                      <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      <span className="font-semibold text-slate-900 tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">By severity</p>
                <div className="space-y-1">
                  {["SEVERE", "MAJOR", "MODERATE", "MINOR"].map(s => {
                    const row = severityCounts.find(r => r.severity === s);
                    return (
                      <div key={s} className="flex items-center justify-between gap-2">
                        <Badge tone={SEVERITY_TONE[s]}>{SEVERITY_LABEL[s]}</Badge>
                        <span className="font-semibold text-slate-900 tabular-nums">{row?._count._all ?? 0}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* By category */}
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <Badge tone="neutral">{categoryCounts.length}</Badge>
          </CardHeader>
          <CardBody>
            {categoryCounts.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">No data.</p>
            ) : (
              <div className="space-y-2">
                {categoryCounts.map(c => {
                  const pct = total > 0 ? (c._count._all / total) * 100 : 0;
                  return (
                    <div key={c.category} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-700">{CATEGORY_LABEL[c.category]}</span>
                        <span className="text-xs text-slate-500 tabular-nums">{c._count._all} · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Per-class hot spots */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle><Users className="h-4 w-4 inline mr-1" /> Per-class hot spots</CardTitle>
          <Badge tone="neutral">{perClass.length} classes</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {perClass.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No cases in this window.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Class</th>
                  <th className="text-right px-4 py-2.5 font-medium">Cases</th>
                  <th className="text-right px-4 py-2.5 font-medium">Class size</th>
                  <th className="text-right px-4 py-2.5 font-medium">Rate per 10 students</th>
                </tr>
              </thead>
              <tbody>
                {perClass.map(c => (
                  <tr key={c.classId} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-brand-900">{c.label}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums">{c.count}</td>
                    <td className="px-4 py-2 text-right text-slate-600 tabular-nums">{c.students || "—"}</td>
                    <td className={`px-4 py-2 text-right font-semibold tabular-nums ${c.ratePer10 >= 3 ? "text-rose-700" : c.ratePer10 >= 1 ? "text-amber-700" : "text-slate-700"}`}>
                      {c.students > 0 ? c.ratePer10 : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recurring offenders */}
        <Card>
          <CardHeader>
            <CardTitle><AlertTriangle className="h-4 w-4 inline mr-1 text-rose-600" /> Recurring offenders</CardTitle>
            <Badge tone={recurring.length === 0 ? "success" : "warning"}>{recurring.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {recurring.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No student has more than one case in this window. 🎉</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recurring.map(r => (
                  <Link key={r.studentId} href={`/portal/admin/students/${r.studentId}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.admissionNumber} · {r.className}</p>
                    </div>
                    <Badge tone="warning">{r.count} cases</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Sanction breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sanction outcomes</CardTitle>
            <Badge tone="neutral">{sanctionCounts.length}</Badge>
          </CardHeader>
          <CardBody>
            {sanctionCounts.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-4">No data.</p>
            ) : (
              <div className="space-y-2">
                {sanctionCounts.map(s => {
                  const pct = total > 0 ? (s._count._all / total) * 100 : 0;
                  return (
                    <div key={s.sanction} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-700">{SANCTION_LABEL[s.sanction]}</span>
                        <span className="text-xs text-slate-500 tabular-nums">{s._count._all} · {Math.round(pct)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="text-xs text-slate-500 mt-6">
        <Calendar className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
        Term / session windows use the dates set on the active Term &amp; Session — if those aren't filled in, a coarse 90-day / 12-month fallback is used.
      </p>
    </PortalShell>
  );
}
