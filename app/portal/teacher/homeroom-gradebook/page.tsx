import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { ArrowLeft, FileText, AlertCircle, Users, Award, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const gradeColor: Record<string, string> = {
  A1: "bg-emerald-50 text-emerald-700", B2: "bg-emerald-50 text-emerald-700", B3: "bg-emerald-50 text-emerald-700",
  C4: "bg-sky-50 text-sky-700", C5: "bg-sky-50 text-sky-700", C6: "bg-sky-50 text-sky-700",
  D7: "bg-amber-50 text-amber-700", E8: "bg-amber-50 text-amber-700",
  F9: "bg-rose-50 text-rose-700",
};

type SearchParams = { class?: string };

export default async function HomeroomGradebookPage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await getCurrentTeacher();
  const { session, term } = await getActiveContext();

  if (teacher.classTeacherOf.length === 0) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">You're not a form teacher</p>
          <p className="text-sm text-slate-500 mt-1">The class-wide gradebook is for form teachers of a homeroom class.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  if (!term || !session) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedClassId = searchParams.class && teacher.classTeacherOf.some(c => c.id === searchParams.class)
    ? searchParams.class
    : teacher.classTeacherOf[0].id;
  const selectedClass = teacher.classTeacherOf.find(c => c.id === selectedClassId)!;

  // Load: students in class, subjects offered in class, and every existing result for the term.
  const [students, classSubjects, results] = await Promise.all([
    prisma.student.findMany({
      where: { classId: selectedClassId, graduatedAt: null },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.classSubject.findMany({
      where: { classId: selectedClassId },
      include: { subject: { select: { id: true, name: true, code: true } } },
      orderBy: { subject: { code: "asc" } },
    }),
    prisma.result.findMany({
      where: { termId: term.id, student: { classId: selectedClassId } },
      select: {
        studentId: true, subjectId: true, ca1: true, ca2: true, exam: true, total: true,
        grade: true, isPublished: true, position: true,
      },
    }),
  ]);

  // Index results by (studentId, subjectId) for O(1) cell lookups.
  const resultMap = new Map<string, typeof results[number]>();
  for (const r of results) resultMap.set(`${r.studentId}:${r.subjectId}`, r);

  // Per-student summary.
  const studentSummary = students.map(s => {
    const rows = results.filter(r => r.studentId === s.id);
    const subjectsScored = rows.length;
    const totalSum = rows.reduce((a, b) => a + b.total, 0);
    const avg = subjectsScored > 0 ? Math.round((totalSum / subjectsScored) * 10) / 10 : 0;
    const position = rows.find(r => r.position !== null)?.position ?? null;
    return { studentId: s.id, subjectsScored, totalSum, avg, position };
  });

  // Compute class position from the gradebook itself (sum of totals).
  const ranked = [...studentSummary].sort((a, b) => b.totalSum - a.totalSum);
  const rankByStudent = new Map<string, number>();
  ranked.forEach((s, i) => rankByStudent.set(s.studentId, i + 1));

  const totalScored = studentSummary.filter(s => s.subjectsScored > 0).length;
  const classAvg = totalScored > 0
    ? Math.round((studentSummary.reduce((s, x) => s + x.avg, 0) / totalScored) * 10) / 10
    : 0;
  const publishedCount = results.filter(r => r.isPublished).length;
  const totalCells = students.length * classSubjects.length;
  const completionPct = totalCells > 0 ? Math.round((results.length / totalCells) * 100) : 0;

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/teacher" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Homeroom · Gradebook
            </p>
            <h1 className="text-2xl font-bold text-brand-900">{selectedClass.name}{selectedClass.arm} — class gradebook</h1>
            <p className="text-sm text-slate-500">
              {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session.name} · read-only
            </p>
          </div>
        </div>
        <Link href={`/portal/teacher/comments?class=${selectedClassId}`}>
          <Button variant="outline"><MessageSquare className="h-4 w-4" /> Write class teacher comments</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Students" value={students.length} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Subjects" value={classSubjects.length} accent="sky" />
        <StatCard label="Class avg" value={classAvg > 0 ? `${classAvg}%` : "—"} icon={<Award className="h-5 w-5" />} accent="gold" />
        <StatCard label="Scoring complete" value={`${completionPct}%`} hint={`${results.length} of ${totalCells} cells`} accent="emerald" />
      </div>

      {/* Class picker if multi-form-teacher */}
      {teacher.classTeacherOf.length > 1 && (
        <Card className="mb-4">
          <CardBody className="py-3">
            <form method="GET" className="flex items-center gap-2 text-sm">
              <label className="text-slate-600">Class:</label>
              <select name="class" defaultValue={selectedClassId} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                {teacher.classTeacherOf.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
                ))}
              </select>
              <Button type="submit" variant="outline">Load</Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grade matrix</CardTitle>
          <Badge tone={publishedCount > 0 ? "success" : "neutral"}>
            {publishedCount} of {results.length} published
          </Badge>
        </CardHeader>
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No students in this class.</div>
          ) : classSubjects.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No subjects offered in this class yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-slate-500 sticky left-0 bg-slate-50 z-10">Student</th>
                    {classSubjects.map(cs => (
                      <th key={cs.subject.id} className="text-center px-2 py-2 font-medium text-slate-500" title={cs.subject.name}>
                        {cs.subject.code}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2 font-medium text-slate-500">Total</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-500">Avg</th>
                    <th className="text-center px-3 py-2 font-medium text-slate-500">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const summary = studentSummary.find(x => x.studentId === s.id)!;
                    const pos = rankByStudent.get(s.id) ?? "—";
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 sticky left-0 bg-white hover:bg-slate-50">
                          <Link href={`/portal/teacher/students/${s.id}`} className="text-sm font-medium text-brand-900 hover:underline">{s.user.name}</Link>
                          <div className="text-[10px] text-slate-500 font-mono">{s.admissionNumber}</div>
                        </td>
                        {classSubjects.map(cs => {
                          const r = resultMap.get(`${s.id}:${cs.subject.id}`);
                          if (!r) return <td key={cs.subject.id} className="px-2 py-2 text-center text-slate-300">—</td>;
                          return (
                            <td key={cs.subject.id} className="px-2 py-2 text-center">
                              <div className="font-semibold text-slate-900 tabular-nums">{r.total}</div>
                              {r.grade && (
                                <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${gradeColor[r.grade] ?? "bg-slate-50 text-slate-600"}`}>
                                  {r.grade}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-semibold text-brand-900 tabular-nums">{summary.totalSum || "—"}</td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{summary.avg > 0 ? `${summary.avg}%` : "—"}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700">{summary.totalSum > 0 ? pos : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-slate-500 mt-4">
        <FileText className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
        Read-only view. Subject teachers enter their own scores via <Link href="/portal/teacher/results" className="underline">Score Entry</Link>. Position is computed from the sum of totals in this class.
      </p>
    </PortalShell>
  );
}
