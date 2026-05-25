import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { savePrincipalComments } from "./actions";
import {
  ArrowLeft, MessageSquare, AlertCircle, CheckCircle2, Save, Users, ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type SearchParams = { class?: string; saved?: string; error?: string };

export default async function PrincipalCommentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["SUPER_ADMIN", "DIRECTOR"]);
  const { session, term } = await getActiveContext();

  const allClasses = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    select: {
      id: true, name: true, arm: true,
      _count: { select: { students: { where: { graduatedAt: null } } } },
    },
  });

  if (!term || !session) {
    return (
      <PortalShell role="director">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term</p>
          <p className="text-sm text-slate-500 mt-1">Activate a term in Sessions before writing principal comments.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedClassId = searchParams.class && allClasses.some(c => c.id === searchParams.class)
    ? searchParams.class
    : allClasses[0]?.id ?? null;
  const selectedClass = selectedClassId ? allClasses.find(c => c.id === selectedClassId) : null;

  if (!selectedClass) {
    return (
      <PortalShell role="director">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No classes yet</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const students = await prisma.student.findMany({
    where: { classId: selectedClass.id, graduatedAt: null },
    include: {
      user: { select: { name: true, image: true } },
      termReports: {
        where: { termId: term.id, sessionId: session.id },
        select: { principalComment: true, principalAt: true, principalByName: true, classTeacherComment: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const withPrincipalComments = students.filter(s => s.termReports[0]?.principalComment).length;
  const termLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term`;

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/director" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> Principal's report-card comments
            </p>
            <h1 className="text-2xl font-bold text-brand-900">{selectedClass.name}{selectedClass.arm} · {termLabel}</h1>
            <p className="text-sm text-slate-500">
              These appear on each student's report card under <em>"Principal's Comment"</em>. Session {session.name}.
            </p>
          </div>
        </div>
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
        <StatCard label="With principal note" value={withPrincipalComments} hint={`${students.length - withPrincipalComments} to go`} accent="emerald" />
        <StatCard label="Term" value={termLabel} hint={session.name} accent="gold" />
      </div>

      <Card className="mb-4">
        <CardBody className="py-3">
          <form method="GET" className="flex items-center gap-2 text-sm flex-wrap">
            <label className="text-slate-600"><ClipboardList className="h-4 w-4 inline mr-1" /> Choose class:</label>
            <select name="class" defaultValue={selectedClass.id} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
              {allClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.arm} ({c._count.students})</option>
              ))}
            </select>
            <Button type="submit" variant="outline">Load class</Button>
          </form>
        </CardBody>
      </Card>

      <form action={savePrincipalComments}>
        <input type="hidden" name="classId" value={selectedClass.id} />

        <Card>
          <CardHeader>
            <CardTitle>Per-student principal comments</CardTitle>
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
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {photo ? <img src={photo} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                          </div>
                          <div className="min-w-0">
                            <Link href={`/portal/admin/students/${s.id}`} className="text-sm font-medium text-brand-900 hover:underline truncate block">
                              {s.user.name}
                            </Link>
                            <p className="text-[11px] text-slate-500 font-mono">{s.admissionNumber}</p>
                          </div>
                        </div>
                        {existing?.classTeacherComment && (
                          <div className="mt-2 rounded bg-slate-50 border border-slate-200 px-2 py-1.5 text-[11px] text-slate-600">
                            <p className="font-semibold uppercase tracking-wide text-slate-500 text-[10px]">Class teacher said</p>
                            <p className="mt-0.5 line-clamp-3">{existing.classTeacherComment}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <Textarea
                          name={`comment:${s.id}`}
                          rows={2}
                          defaultValue={existing?.principalComment ?? ""}
                          placeholder="e.g. A strong term overall. Keep building on the discipline and we'll see real heights next year."
                          maxLength={1000}
                        />
                        {existing?.principalAt && (
                          <p className="text-[10px] text-slate-500 mt-1">
                            Last saved {dateTimeFmt.format(existing.principalAt)} by {existing.principalByName ?? "you"}.
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
            Save any time. The principal's note appears alongside the class teacher's note on each printed result slip.
          </p>
          <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save all comments</Button>
        </div>
      </form>
    </PortalShell>
  );
}
