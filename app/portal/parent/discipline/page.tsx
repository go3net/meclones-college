import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { Shield, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function ParentDisciplinePage() {
  const parent = await getCurrentParentWithChildren();
  const studentIds = parent.children.map(c => c.student.id);

  const cases = studentIds.length === 0 ? [] : await prisma.disciplinaryCase.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const needsAck = cases.filter(c => !c.parentAcknowledged && c.status !== "RESOLVED").length;

  return (
    <PortalShell role="parent">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" /> Discipline
        </p>
        <h1 className="text-2xl font-bold text-brand-900">Disciplinary records</h1>
        <p className="text-sm text-slate-500">Formal incident reports filed by the school. Open one to acknowledge.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Total cases" value={cases.length} icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard label="Need your acknowledgement" value={needsAck} icon={<AlertTriangle className="h-5 w-5" />} accent="rose" />
        <StatCard label="Resolved" value={cases.filter(c => c.status === "RESOLVED").length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
      </div>

      <Card>
        <CardHeader><CardTitle>Your children's cases</CardTitle><Badge tone="neutral">{cases.length}</Badge></CardHeader>
        <CardBody className="p-0">
          {cases.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
              <p className="font-medium text-slate-700">All clear</p>
              <p className="text-sm text-slate-500 mt-1">No disciplinary cases on file for any of your children.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Child</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-center px-4 py-2 font-medium">Severity</th>
                  <th className="text-left px-4 py-2 font-medium">Sanction</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-center px-4 py-2 font-medium">Acknowledged</th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className={`border-t border-slate-100 hover:bg-slate-50 ${!c.parentAcknowledged && c.status !== "RESOLVED" ? "bg-rose-50/40" : ""}`}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link href={`/portal/parent/discipline/${c.id}`} className="hover:underline">{dateFmt.format(c.incidentDate)}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/portal/parent/discipline/${c.id}`} className="font-medium text-brand-900 hover:underline">{c.student.user.name}</Link>
                      <div className="text-[11px] text-slate-500">{c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : ""}</div>
                    </td>
                    <td className="px-4 py-2">{CATEGORY_LABEL[c.category]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge></td>
                    <td className="px-4 py-2 text-xs text-slate-700">{SANCTION_LABEL[c.sanction]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></td>
                    <td className="px-4 py-2 text-center">
                      {c.parentAcknowledged ? <Badge tone="success">Yes</Badge> : <Badge tone="warning">Action needed</Badge>}
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
