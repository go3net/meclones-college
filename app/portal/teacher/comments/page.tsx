import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { saveClassTeacherComments } from "./actions";
import {
  ArrowLeft, MessageSquare, AlertCircle, CheckCircle2, Save, Users, FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type SearchParams = { class?: string; saved?: string; error?: string };

export default async function TeacherCommentsPage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await getCurrentTeacher();
  const { session, term } = await getActiveContext();

  if (teacher.classTeacherOf.length === 0) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">You're not a form teacher</p>
          <p className="text-sm text-slate-500 mt-1">Class teacher comments are written by the form teacher of each class. You aren't assigned to one.</p>
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
          <p className="text-sm text-slate-500 mt-1">Ask the director to activate a term before writing comments.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  // Class picker — usually only one class, but support multi-form teachers.
  const selectedClassId = searchParams.class && teacher.classTeacherOf.some(c => c.id === searchParams.class)
    ? searchParams.class
    : teacher.classTeacherOf[0].id;
  const selectedClass = teacher.classTeacherOf.find(c => c.id === selectedClassId)!;

  const students = await prisma.student.findMany({
    where: { classId: selectedClassId, graduatedAt: null },
    include: {
      user: { select: { name: true, image: true } },
      termReports: {
        where: { termId: term.id, sessionId: session.id },
        select: { classTeacherComment: true, classTeacherAt: true, classTeacherByName: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const withComments = students.filter(s => s.termReports[0]?.classTeacherComment).length;
  const termLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term`;

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/teacher" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Homeroom · Class teacher comments
            </p>
            <h1 className="text-2xl font-bold text-brand-900">{selectedClass.name}{selectedClass.arm} · {termLabel} comments</h1>
            <p className="text-sm text-slate-500">
              These appear on each student's report card under <em>"Class Teacher's Comment"</em>. Session {session.name}.
            </p>
          </div>
        </div>
        <Link href={`/portal/teacher/homeroom-gradebook?class=${selectedClassId}`}>
          <Button variant="outline"><FileText className="h-4 w-4" /> Open gradebook</Button>
        </Link>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved comments for {searchParams.saved} student{searchParams.saved === "1" ? "" : "s"}.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Students" value={students.length} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="With comments" value={withComments} hint={`${students.length - withComments} to go`} accent="emerald" />
        <StatCard label="Term" value={termLabel} hint={session.name} accent="gold" />
      </div>

      {/* Class picker — for the rare multi-form-teacher case */}
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

      <form action={saveClassTeacherComments}>
        <input type="hidden" name="classId" value={selectedClassId} />

        <Card>
          <CardHeader>
            <CardTitle>Per-student comments</CardTitle>
            <Badge tone="neutral">{students.length} students</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {students.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No active students in this class.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {students.map(s => {
                  const photo = s.photoUrl ?? s.user.image ?? null;
                  const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                  const existing = s.termReports[0];
                  return (
                    <div key={s.id} className="px-4 py-3 grid lg:grid-cols-[200px_1fr] gap-3 items-start">
                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {photo ? <img src={photo} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/portal/teacher/students/${s.id}`} className="text-sm font-medium text-brand-900 hover:underline truncate block">
                            {s.user.name}
                          </Link>
                          <p className="text-[11px] text-slate-500 font-mono">{s.admissionNumber}</p>
                        </div>
                      </div>
                      <div>
                        <Textarea
                          name={`comment:${s.id}`}
                          rows={2}
                          defaultValue={existing?.classTeacherComment ?? ""}
                          placeholder="e.g. Adunni has shown great improvement this term and contributes well in class. Should work on punctuality."
                          maxLength={1000}
                        />
                        {existing?.classTeacherAt && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            Last saved {dateTimeFmt.format(existing.classTeacherAt)} by {existing.classTeacherByName ?? "you"}.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-slate-500">
            Save any time — only changed rows are written. These appear on the printed result slip.
          </p>
          <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save all comments</Button>
        </div>
      </form>
    </PortalShell>
  );
}
