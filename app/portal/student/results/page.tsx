import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent, getActiveContext } from "@/lib/auth-helpers";
import { FileText, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

const gradeColor: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  A1: "success", B2: "success", B3: "success",
  C4: "info", C5: "info", C6: "info",
  D7: "warning", E8: "warning",
  F9: "danger",
};

export default async function StudentResultsPage() {
  const student = await getCurrentStudent();
  const { term, session } = await getActiveContext();

  if (!term) {
    return (
      <PortalShell role="student">
        <Card><CardBody className="text-center py-12">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const results = await prisma.result.findMany({
    where: { studentId: student.id, termId: term.id, isPublished: true },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  const total = results.reduce((s, r) => s + r.total, 0);
  const avg = results.length > 0 ? Math.round((total / results.length) * 10) / 10 : 0;
  const position = results.find(r => r.position !== null)?.position ?? null;
  const classSize = student.classId
    ? await prisma.student.count({ where: { classId: student.classId } })
    : 0;

  return (
    <PortalShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">My Results</h1>
        <p className="text-sm text-slate-500">
          {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session?.name ?? ""} · {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Subjects" value={results.length} icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Term total" value={total} accent="sky" />
        <StatCard label="Average" value={`${avg}%`} accent="emerald" />
        <StatCard label="Position" value={position ? `${position} / ${classSize}` : "—"} icon={<Trophy className="h-5 w-5" />} accent="gold" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject scores</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No published results yet for this term.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                    <th className="text-right px-4 py-2.5 font-medium">CA1 / 20</th>
                    <th className="text-right px-4 py-2.5 font-medium">CA2 / 20</th>
                    <th className="text-right px-4 py-2.5 font-medium">Exam / 60</th>
                    <th className="text-right px-4 py-2.5 font-medium">Total / 100</th>
                    <th className="text-left px-4 py-2.5 font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{r.subject.name}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.ca1}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.ca2}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{r.exam}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-brand-900">{r.total}</td>
                      <td className="px-4 py-2.5">
                        {r.grade ? <Badge tone={gradeColor[r.grade] ?? "neutral"}>{r.grade}</Badge> : <span className="text-slate-400">—</span>}
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
