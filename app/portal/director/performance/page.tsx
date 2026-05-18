import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { TrendingUp, Trophy, AlertCircle, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

const gradeColor: Record<string, "success" | "info" | "warning" | "danger"> = {
  A1: "success", B2: "success", B3: "success",
  C4: "info", C5: "info", C6: "info",
  D7: "warning", E8: "warning", F9: "danger",
};

export default async function DirectorPerformancePage() {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const { session, term } = await getActiveContext();

  if (!term || !session) {
    return (
      <PortalShell role="director">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active session / term</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  // Aggregate published results by class.
  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    include: {
      students: {
        select: {
          id: true,
          user: { select: { name: true } },
          results: {
            where: { termId: term.id, isPublished: true },
            select: { total: true, subject: { select: { name: true } }, grade: true },
          },
        },
      },
    },
  });

  const classRows = classes.map(c => {
    const studentsWithResults = c.students.filter(s => s.results.length > 0);
    const scores = studentsWithResults.map(s => {
      const sum = s.results.reduce((a, r) => a + r.total, 0);
      return { name: s.user.name, avg: s.results.length ? Math.round((sum / s.results.length) * 10) / 10 : 0 };
    });
    const overallAvg = scores.length > 0 ? Math.round(scores.reduce((a, s) => a + s.avg, 0) / scores.length * 10) / 10 : 0;
    const top = scores.length > 0 ? scores.reduce((best, s) => s.avg > best.avg ? s : best) : null;
    const bottom = scores.length > 0 ? scores.reduce((worst, s) => s.avg < worst.avg ? s : worst) : null;
    return {
      id: c.id,
      label: `${c.name}${c.arm}`,
      enrolled: c.students.length,
      scoredCount: scores.length,
      avg: overallAvg,
      top,
      bottom,
    };
  });

  // School-wide averages.
  const allAvg = classRows.filter(r => r.scoredCount > 0);
  const schoolAvg = allAvg.length > 0
    ? Math.round((allAvg.reduce((a, r) => a + r.avg, 0) / allAvg.length) * 10) / 10
    : 0;

  // Top 10 students school-wide.
  const allStudents = classes.flatMap(c => c.students.map(s => {
    const sum = s.results.reduce((a, r) => a + r.total, 0);
    const avg = s.results.length > 0 ? Math.round((sum / s.results.length) * 10) / 10 : null;
    return { id: s.id, name: s.user.name, classLabel: `${c.name}${c.arm}`, avg, subjectCount: s.results.length };
  })).filter(s => s.avg !== null).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  const top10 = allStudents.slice(0, 10);

  // Grade distribution school-wide.
  const allGrades = classes.flatMap(c => c.students.flatMap(s => s.results.map(r => r.grade ?? "—")));
  const gradeDist = allGrades.reduce((acc, g) => {
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const gradeKeys = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];
  const totalGrades = allGrades.length || 1;

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Academic Performance</h1>
          <p className="text-sm text-slate-500">
            {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session.name} · school-wide published results
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="School Avg" value={`${schoolAvg}%`} hint="across all classes" icon={<TrendingUp className="h-5 w-5" />} accent="brand" />
        <StatCard label="Scored Students" value={allStudents.length} hint={`${classes.flatMap(c => c.students).length} total`} icon={<FileText className="h-5 w-5" />} accent="sky" />
        <StatCard label="A1 grades" value={gradeDist.A1 ?? 0} hint={`${Math.round(((gradeDist.A1 ?? 0) / totalGrades) * 100)}% of all subjects`} icon={<Trophy className="h-5 w-5" />} accent="gold" />
        <StatCard label="F9 grades" value={gradeDist.F9 ?? 0} hint="need attention" icon={<AlertCircle className="h-5 w-5" />} accent="rose" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Class averages</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-right px-4 py-2.5 font-medium">Enrolled</th>
                    <th className="text-right px-4 py-2.5 font-medium">Scored</th>
                    <th className="text-right px-4 py-2.5 font-medium">Average</th>
                    <th className="text-left px-4 py-2.5 font-medium">Top</th>
                    <th className="text-left px-4 py-2.5 font-medium">Needs help</th>
                  </tr>
                </thead>
                <tbody>
                  {classRows.map(c => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-brand-900">{c.label}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{c.enrolled}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{c.scoredCount}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{c.scoredCount > 0 ? `${c.avg}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {c.top ? <span><span className="font-medium text-emerald-700">{c.top.avg}%</span> · {c.top.name}</span> : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[12px]">
                        {c.bottom && c.scoredCount > 1 ? <span><span className="font-medium text-rose-700">{c.bottom.avg}%</span> · {c.bottom.name}</span> : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Grade distribution</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {gradeKeys.map(g => {
              const count = gradeDist[g] ?? 0;
              const pct = Math.round((count / totalGrades) * 100);
              return (
                <div key={g} className="flex items-center gap-2 text-sm">
                  <Badge tone={gradeColor[g] ?? "neutral"}>{g}</Badge>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-slate-600 w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
            <p className="text-[11px] text-slate-400 pt-2">Based on {totalGrades.toLocaleString()} published subject scores.</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 students school-wide</CardTitle>
          <Trophy className="h-4 w-4 text-gold-500" />
        </CardHeader>
        <CardBody className="p-0">
          {top10.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No published results yet.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">#</th>
                  <th className="text-left px-4 py-2.5 font-medium">Student</th>
                  <th className="text-left px-4 py-2.5 font-medium">Class</th>
                  <th className="text-right px-4 py-2.5 font-medium">Subjects</th>
                  <th className="text-right px-4 py-2.5 font-medium">Average</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((s, i) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-slate-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-2.5 text-slate-700"><Badge tone="neutral">{s.classLabel}</Badge></td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{s.subjectCount}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-900">{s.avg}%</td>
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
