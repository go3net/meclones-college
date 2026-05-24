import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { Plus, Shield, AlertTriangle, CheckCircle2, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function TeacherDisciplinePage() {
  const teacher = await getCurrentTeacher();

  const allowedClassIds = Array.from(new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]));

  const cases = allowedClassIds.length === 0 ? [] : await prisma.disciplinaryCase.findMany({
    where: {
      OR: [
        { reportedById: teacher.userId },
        { student: { classId: { in: allowedClassIds } } },
      ],
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const open = cases.filter(c => c.status === "OPEN" || c.status === "AWAITING_ACK").length;
  const ownReports = cases.filter(c => c.reportedById === teacher.userId).length;

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Discipline
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Disciplinary cases</h1>
          <p className="text-sm text-slate-500">Cases you've filed, plus any case for students in your classes.</p>
        </div>
        <Link href="/portal/teacher/discipline/new" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-brand-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
          <Plus className="h-4 w-4" /> Report incident
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total visible" value={cases.length} icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard label="Open / awaiting ack" value={open} icon={<AlertTriangle className="h-5 w-5" />} accent="amber" />
        <StatCard label="You filed" value={ownReports} icon={<ClipboardList className="h-5 w-5" />} accent="sky" />
        <StatCard label="Resolved" value={cases.filter(c => c.status === "RESOLVED").length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
      </div>

      <Card>
        <CardHeader><CardTitle>Cases</CardTitle><Badge tone="neutral">{cases.length}</Badge></CardHeader>
        <CardBody className="p-0">
          {cases.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
              <p className="font-medium text-slate-700">No cases on your classes</p>
              <p className="text-sm text-slate-500 mt-1">Nothing reported yet. Click "Report incident" above when you need to file one.</p>
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
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <Link href={`/portal/teacher/discipline/${c.id}`} className="hover:underline">{dateFmt.format(c.incidentDate)}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link href={`/portal/teacher/discipline/${c.id}`} className="font-medium text-brand-900 hover:underline">{c.student.user.name}</Link>
                      <div className="text-[11px] text-slate-500">{c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned"}</div>
                    </td>
                    <td className="px-4 py-2">{CATEGORY_LABEL[c.category]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge></td>
                    <td className="px-4 py-2 text-xs text-slate-700">{SANCTION_LABEL[c.sanction]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></td>
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
