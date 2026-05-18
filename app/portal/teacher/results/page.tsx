import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { FileText, Save, AlertCircle, Send } from "lucide-react";
import { saveResults } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = { classId?: string; subjectId?: string };

export default async function TeacherResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await getCurrentTeacher();
  const { session, term } = await getActiveContext();

  const myClassIds = Array.from(new Set([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.class.id),
  ]));
  const mySubjectIds = teacher.subjects.map(s => s.subject.id);

  const [myClasses, mySubjects] = await Promise.all([
    prisma.class.findMany({
      where: { id: { in: myClassIds } },
      include: { subjects: { include: { subject: true } } },
      orderBy: [{ name: "asc" }, { arm: "asc" }],
    }),
    prisma.subject.findMany({
      where: { id: { in: mySubjectIds } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (myClasses.length === 0 || mySubjects.length === 0) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No class or subject assigned</p>
          <p className="text-sm text-slate-500 mt-1">Ask the school admin to assign you to a class and subject.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedClassId = searchParams.classId && myClasses.some(c => c.id === searchParams.classId)
    ? searchParams.classId
    : myClasses[0].id;
  const selectedClass = myClasses.find(c => c.id === selectedClassId)!;

  // Pick a subject that's both assigned to the teacher AND taught in this class.
  const subjectsTaughtInClass = selectedClass.subjects.map(cs => cs.subject.id);
  const validSubjects = mySubjects.filter(s => subjectsTaughtInClass.includes(s.id));

  if (validSubjects.length === 0) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No subjects available</p>
          <p className="text-sm text-slate-500 mt-1">Your assigned subjects aren't offered in any of your classes yet.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedSubjectId = searchParams.subjectId && validSubjects.some(s => s.id === searchParams.subjectId)
    ? searchParams.subjectId
    : validSubjects[0].id;
  const selectedSubject = validSubjects.find(s => s.id === selectedSubjectId)!;

  const students = term ? await prisma.student.findMany({
    where: { classId: selectedClassId },
    include: { user: { select: { name: true } } },
    orderBy: { admissionNumber: "asc" },
  }) : [];

  const existing = term ? await prisma.result.findMany({
    where: {
      studentId: { in: students.map(s => s.id) },
      subjectId: selectedSubjectId,
      termId: term.id,
    },
    select: { studentId: true, ca1: true, ca2: true, exam: true, total: true, grade: true, isPublished: true },
  }) : [];
  const existingByStudent = new Map(existing.map(r => [r.studentId, r]));
  const anyPublished = existing.some(r => r.isPublished);

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Enter Results</h1>
        <p className="text-sm text-slate-500">
          {term ? `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term` : "No active term"}
          {session ? ` · Session ${session.name}` : ""} · Welcome, {teacher.user.name}
        </p>
      </div>

      <form className="mb-5 flex flex-wrap items-end gap-3" action="">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
          <select name="classId" defaultValue={selectedClassId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {myClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
          <select name="subjectId" defaultValue={selectedSubjectId} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {validSubjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium">Load</button>
      </form>

      {!term ? (
        <Card><CardBody className="text-center py-12 text-sm text-slate-500">No active term — ask admin to activate one.</CardBody></Card>
      ) : (
        <form action={saveResults}>
          <input type="hidden" name="classId" value={selectedClassId} />
          <input type="hidden" name="subjectId" value={selectedSubjectId} />

          <Card>
            <CardHeader>
              <CardTitle>{selectedClass.name}{selectedClass.arm} · {selectedSubject.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{students.length} students</Badge>
                {anyPublished && <Badge tone="success">Published</Badge>}
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {students.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No students in this class yet.</div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Student</th>
                      <th className="text-right px-4 py-2.5 font-medium">CA1 / 20</th>
                      <th className="text-right px-4 py-2.5 font-medium">CA2 / 20</th>
                      <th className="text-right px-4 py-2.5 font-medium">Exam / 60</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total</th>
                      <th className="text-left px-4 py-2.5 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => {
                      const ex = existingByStudent.get(s.id);
                      return (
                        <tr key={s.id} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-medium text-slate-900">
                            {s.user.name}
                            <div className="text-[11px] text-slate-500 font-mono">{s.admissionNumber}</div>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              name={`ca1:${s.id}`}
                              min={0}
                              max={20}
                              defaultValue={ex?.ca1 ?? ""}
                              className="w-16 text-right rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              name={`ca2:${s.id}`}
                              min={0}
                              max={20}
                              defaultValue={ex?.ca2 ?? ""}
                              className="w-16 text-right rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              name={`exam:${s.id}`}
                              min={0}
                              max={60}
                              defaultValue={ex?.exam ?? ""}
                              className="w-16 text-right rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-brand-900">{ex?.total ?? "—"}</td>
                          <td className="px-4 py-2">{ex?.grade ? <Badge tone="neutral">{ex.grade}</Badge> : <span className="text-slate-400 text-xs">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500">
              <FileText className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
              Save to draft any time. Publishing makes results visible to students &amp; parents and locks them from further edits in the WhatsApp bot.
            </p>
            <div className="flex gap-2">
              <button type="submit" name="action" value="save" className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium">
                <Save className="h-4 w-4" /> Save draft
              </button>
              <button type="submit" name="action" value="save_and_publish" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <Send className="h-4 w-4" /> Save &amp; publish
              </button>
            </div>
          </div>
        </form>
      )}
    </PortalShell>
  );
}
