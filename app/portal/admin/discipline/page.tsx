import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { Plus, Shield, AlertTriangle, CheckCircle2, ClipboardList, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { status?: string; severity?: string; class?: string };

export default async function AdminDisciplinePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const status = searchParams.status?.toUpperCase();
  const severity = searchParams.severity?.toUpperCase();
  const classId = searchParams.class;

  const where: any = {};
  if (status && ["OPEN", "AWAITING_ACK", "RESOLVED", "APPEALED", "ESCALATED"].includes(status)) {
    where.status = status;
  }
  if (severity && ["MINOR", "MODERATE", "MAJOR", "SEVERE"].includes(severity)) {
    where.severity = severity;
  }
  if (classId) {
    where.student = { classId };
  }

  const [cases, openCount, ackPending, severeCount, classes] = await Promise.all([
    prisma.disciplinaryCase.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            classRef: { select: { name: true, arm: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.disciplinaryCase.count({ where: { status: "OPEN" } }),
    prisma.disciplinaryCase.count({ where: { status: "AWAITING_ACK" } }),
    prisma.disciplinaryCase.count({ where: { severity: { in: ["MAJOR", "SEVERE"] }, status: { not: "RESOLVED" } } }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }], select: { id: true, name: true, arm: true } }),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Discipline
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Disciplinary cases</h1>
          <p className="text-sm text-slate-500">Formal records of incidents, sanctions and parent acknowledgements.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/portal/admin/discipline/stats" className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg">
            <TrendingUp className="h-4 w-4" /> Statistics
          </Link>
          <Link href="/portal/admin/discipline/new" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-brand-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
            <Plus className="h-4 w-4" /> Report incident
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total cases" value={cases.length} icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard label="Open" value={openCount} icon={<AlertTriangle className="h-5 w-5" />} accent="amber" />
        <StatCard label="Awaiting parent ack" value={ackPending} icon={<AlertTriangle className="h-5 w-5" />} accent="sky" />
        <StatCard label="Major / severe live" value={severeCount} icon={<AlertTriangle className="h-5 w-5" />} accent="rose" />
      </div>

      <Card className="mb-4">
        <CardBody className="py-3">
          <form className="flex flex-wrap items-end gap-3 text-sm">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Status</label>
              <select name="status" defaultValue={status ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">All</option>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Severity</label>
              <select name="severity" defaultValue={severity ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">All</option>
                {Object.entries(SEVERITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Class</label>
              <select name="class" defaultValue={classId ?? ""} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="">All</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
              </select>
            </div>
            <Button type="submit" variant="outline">Filter</Button>
            {(status || severity || classId) && (
              <Link href="/portal/admin/discipline" className="text-xs text-slate-500 underline self-center">Clear</Link>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cases</CardTitle><Badge tone="neutral">{cases.length}</Badge></CardHeader>
        <CardBody className="p-0">
          {cases.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
              <p className="font-medium text-slate-700">No matching cases</p>
              <p className="text-sm text-slate-500 mt-1">Either nothing has been reported yet, or your filters are too tight.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Student</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-center px-4 py-2 font-medium">Severity</th>
                  <th className="text-left px-4 py-2 font-medium">Sanction</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-center px-4 py-2 font-medium">Parent ack</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link href={`/portal/admin/discipline/${c.id}`} className="hover:underline">
                        {dateFmt.format(c.incidentDate)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/portal/admin/discipline/${c.id}`} className="font-medium text-brand-900 hover:underline">{c.student.user.name}</Link>
                      <div className="text-[11px] text-slate-500">{c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned"}</div>
                    </td>
                    <td className="px-4 py-2">{CATEGORY_LABEL[c.category]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge></td>
                    <td className="px-4 py-2 text-xs text-slate-700">{SANCTION_LABEL[c.sanction]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></td>
                    <td className="px-4 py-2 text-center">
                      {c.parentAcknowledged ? <Badge tone="success">Yes</Badge> : <span className="text-[11px] text-slate-400">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
