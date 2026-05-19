import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { Users, BookOpen, ClipboardList, CheckSquare, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function TeacherDashboard() {
  const teacher = await getCurrentTeacher();
  const { term } = await getActiveContext();

  const classIds = Array.from(new Set([
    ...teacher.classes.map(c => c.classId),
    ...teacher.classTeacherOf.map(c => c.id),
  ]));
  const subjectIds = teacher.subjects.map(s => s.subjectId);

  // Student head-count across the classes they teach.
  const studentCount = classIds.length === 0 ? 0 : await prisma.student.count({
    where: { classId: { in: classIds } },
  });

  // Today's attendance marks they've already entered (for the active term).
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todaysMarks = term ? await prisma.attendance.count({
    where: { markedById: teacher.id, date: { gte: todayStart } },
  }) : 0;

  // KPIs across the term: total marks recorded, total result rows entered,
  // and average score across results they entered (where they're the author).
  const [marksThisTerm, resultsEntered, scoreAgg] = term ? await Promise.all([
    prisma.attendance.count({ where: { markedById: teacher.id, termId: term.id } }),
    prisma.result.count({ where: { enteredById: teacher.id, termId: term.id } }),
    prisma.result.aggregate({
      where: { enteredById: teacher.id, termId: term.id },
      _avg: { total: true },
      _count: { _all: true },
    }),
  ]) : [0, 0, { _avg: { total: null }, _count: { _all: 0 } } as { _avg: { total: number | null }; _count: { _all: number } }];

  const avgScore = scoreAgg._avg.total !== null ? Math.round(scoreAgg._avg.total * 10) / 10 : null;

  // Marking coverage: how many of (their students × days the term has been running) they've covered.
  // Simple proxy: number of marks vs (students × days) where days = unique attendance dates so far for active term.
  const distinctDates = term ? await prisma.attendance.findMany({
    where: { termId: term.id },
    distinct: ["date"],
    select: { date: true },
  }) : [];
  const expectedMarks = studentCount * distinctDates.length;
  const coveragePct = expectedMarks > 0 ? Math.min(100, Math.round((marksThisTerm / expectedMarks) * 100)) : 0;

  // Recent attendance batches they've recorded.
  const recentMarks = await prisma.attendance.findMany({
    where: { markedById: teacher.id },
    orderBy: { date: "desc" },
    take: 8,
    include: { student: { include: { user: { select: { name: true } } } }, class: { select: { name: true, arm: true } } },
  });

  // Recent announcements
  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ audience: "ALL" }, { audience: "STAFF" }], publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Welcome, {teacher.user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          {teacher.classTeacherOf.length > 0 && (
            <>Form teacher of <Badge tone="gold" className="ml-1">{teacher.classTeacherOf.map(c => `${c.name}${c.arm}`).join(", ")}</Badge> · </>
          )}
          {term ? `${term.name.charAt(0) + term.name.slice(1).toLowerCase()} term` : "no active term"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatCard label="Classes" value={classIds.length} hint="assigned" icon={<BookOpen className="h-5 w-5" />} accent="brand" />
        <StatCard label="Subjects" value={subjectIds.length} hint="teaching" icon={<ClipboardList className="h-5 w-5" />} accent="sky" />
        <StatCard label="Students" value={studentCount} hint="across classes" icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Marked today" value={todaysMarks} hint="attendance entries" icon={<CheckSquare className="h-5 w-5" />} accent="gold" />
      </div>

      {/* KPIs for the term */}
      <Card className="mb-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white border-0">
        <CardBody>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <p className="text-xs uppercase tracking-wide text-gold-300">This term — KPIs</p>
              <p className="font-display text-2xl font-bold mt-1">Your teaching impact</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-[2] min-w-[260px]">
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{marksThisTerm}</p>
                <p className="text-xs text-slate-200 mt-1">Attendance marks</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{coveragePct}%</p>
                <p className="text-xs text-slate-200 mt-1">Marking coverage</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{resultsEntered}</p>
                <p className="text-xs text-slate-200 mt-1">Scores entered</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{avgScore !== null ? `${avgScore}` : "—"}</p>
                <p className="text-xs text-slate-200 mt-1">Avg student score</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your classes & subjects</CardTitle>
          </CardHeader>
          <CardBody>
            {classIds.length === 0 && subjectIds.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">You haven't been assigned any classes or subjects yet. Contact the admin office.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Classes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.classTeacherOf.map(c => (
                      <Badge key={`form-${c.name}-${c.arm}`} tone="gold">{c.name}{c.arm} (form)</Badge>
                    ))}
                    {teacher.classes.filter(ct => !teacher.classTeacherOf.some(f => f.id === ct.classId)).map(ct => (
                      <Badge key={ct.classId} tone="neutral">{ct.class.name}{ct.class.arm}</Badge>
                    ))}
                    {classIds.length === 0 && <span className="text-xs text-slate-400">None yet</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjects.map(s => (
                      <Badge key={s.subjectId} tone="info">{s.subject.code} — {s.subject.name}</Badge>
                    ))}
                    {subjectIds.length === 0 && <span className="text-xs text-slate-400">None yet</span>}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex gap-2 flex-wrap">
              <Link href="/portal/teacher/attendance"><Button><CheckSquare className="h-4 w-4" /> Mark Attendance</Button></Link>
              <Link href="/portal/teacher/results"><Button variant="outline">Enter Scores <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent attendance marks</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {recentMarks.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No attendance recorded yet.</p>
            ) : (
              recentMarks.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 text-sm border-b border-slate-100 pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{m.student.user.name}</p>
                    <p className="text-[11px] text-slate-500">{m.class.name}{m.class.arm} · {dateFmt.format(m.date)}</p>
                  </div>
                  <Badge tone={m.status === "PRESENT" ? "success" : m.status === "LATE" ? "warning" : "danger"}>{m.status}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {announcements.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-brand-900">{a.title}</p>
                  <span className="text-[11px] text-slate-500">{a.publishedAt && dateFmt.format(a.publishedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{a.body}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
