import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE } from "@/lib/discipline";
import {
  CheckSquare, AlertTriangle, Cake, Wallet, Shield, ClipboardList,
  CheckCircle2, Users, ArrowRight, MessageSquarePlus,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const monthDayFmt = new Intl.DateTimeFormat("en-NG", { month: "short", day: "numeric" });
const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function TeacherRosterPage() {
  const teacher = await getCurrentTeacher();
  const { term, session } = await getActiveContext();

  // Roster is for form (class) teachers only.
  if (teacher.classTeacherOf.length === 0) {
    redirect("/portal/teacher");
  }

  // If teacher is form-teacher of multiple classes (rare), show the first.
  // A multi-class picker can come later if needed.
  const myClass = teacher.classTeacherOf[0];
  const classId = myClass.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // 30-day birthday window from today.
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const [students, todaysAttendance, openCases, recentNotes, outstandingFees] = await Promise.all([
    prisma.student.findMany({
      where: { classId, graduatedAt: null },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.attendance.findMany({
      where: { classId, date: { gte: todayStart, lte: todayEnd } },
      select: { studentId: true, status: true },
    }),
    prisma.disciplinaryCase.findMany({
      where: { student: { classId }, status: { not: "RESOLVED" } },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.studentNote.findMany({
      where: {
        student: { classId },
        visibility: { in: ["STAFF_ONLY", "PARENT_VISIBLE"] },
      },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    term ? prisma.fee.findMany({
      where: {
        student: { classId },
        termId: term.id,
        balance: { gt: 0 },
      },
      include: { student: { include: { user: { select: { name: true } } } } },
      orderBy: { balance: "desc" },
      take: 10,
    }) : Promise.resolve([]),
  ]);

  // Index today's attendance by student.
  const attByStudent = new Map(todaysAttendance.map(a => [a.studentId, a.status]));
  const presentToday = todaysAttendance.filter(a => a.status === "PRESENT").length;
  const lateToday = todaysAttendance.filter(a => a.status === "LATE").length;
  const absentToday = todaysAttendance.filter(a => a.status === "ABSENT").length;
  const unmarked = students.length - todaysAttendance.length;

  // Compute upcoming birthdays in the next 30 days (uses month-day comparison
  // so it works year-over-year). Skip students without a DOB.
  const todayMonth = todayStart.getMonth();
  const todayDay = todayStart.getDate();
  const horizonMonth = in30Days.getMonth();
  const horizonDay = in30Days.getDate();
  const upcomingBirthdays = students
    .filter(s => s.dob)
    .map(s => {
      const dob = s.dob as Date;
      const m = dob.getMonth();
      const d = dob.getDate();
      // Build this year's birthday; if already past, push to next year.
      const thisYear = todayStart.getFullYear();
      let bday = new Date(thisYear, m, d);
      if (bday < todayStart) bday = new Date(thisYear + 1, m, d);
      const daysAway = Math.round((bday.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
      return { student: s, bday, daysAway };
    })
    .filter(x => x.daysAway <= 30)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 8);

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> Homeroom
          </p>
          <h1 className="text-2xl font-bold text-brand-900">{myClass.name}{myClass.arm} · Daily roster</h1>
          <p className="text-sm text-slate-500">
            {dateFmt.format(new Date())}{term && session && ` · ${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term ${session.name}`}
          </p>
        </div>
        <Link href="/portal/teacher/attendance" className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-brand-900 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
          <CheckSquare className="h-4 w-4" /> Mark attendance
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Roster" value={students.length} hint="students" icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Present" value={presentToday} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Late" value={lateToday} icon={<AlertTriangle className="h-5 w-5" />} accent="amber" />
        <StatCard label="Absent" value={absentToday} icon={<AlertTriangle className="h-5 w-5" />} accent="rose" />
        <StatCard label="Unmarked" value={unmarked} hint="not in today's log" icon={<ClipboardList className="h-5 w-5" />} accent="sky" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Roster table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's roster</CardTitle>
            <Badge tone="neutral">{students.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {students.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No students in this class yet.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Student</th>
                    <th className="text-left px-4 py-2 font-medium">Admission #</th>
                    <th className="text-center px-4 py-2 font-medium">Today</th>
                    <th className="text-center px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const status = attByStudent.get(s.id);
                    const photo = s.photoUrl ?? s.user.image ?? null;
                    const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <Link href={`/portal/teacher/students/${s.id}`} className="flex items-center gap-2 hover:underline">
                            <div className="relative h-7 w-7 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {photo ? <img src={photo} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                            </div>
                            <span className="font-medium text-brand-900">{s.user.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500 font-mono">{s.admissionNumber}</td>
                        <td className="px-4 py-2 text-center">
                          {status === "PRESENT" && <Badge tone="success">Present</Badge>}
                          {status === "LATE" && <Badge tone="warning">Late</Badge>}
                          {status === "ABSENT" && <Badge tone="danger">Absent</Badge>}
                          {!status && <span className="text-[11px] text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/portal/teacher/discipline/new?student=${s.id}`}
                            title="Report disciplinary incident"
                            className="inline-flex items-center gap-1 text-[11px] text-rose-700 hover:bg-rose-50 px-2 py-1 rounded"
                          >
                            <Shield className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Birthdays */}
        <Card>
          <CardHeader>
            <CardTitle><Cake className="h-4 w-4 inline mr-1 text-rose-500" /> Upcoming birthdays</CardTitle>
            <Badge tone="neutral">{upcomingBirthdays.length}</Badge>
          </CardHeader>
          <CardBody className="space-y-2">
            {upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No birthdays in the next 30 days{students.some(s => !s.dob) && " (some students have no DOB on file)"}.</p>
            ) : (
              upcomingBirthdays.map(({ student, bday, daysAway }) => (
                <div key={student.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 pb-2 last:border-0">
                  <Link href={`/portal/teacher/students/${student.id}`} className="font-medium text-brand-900 truncate hover:underline">{student.user.name}</Link>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-700">{monthDayFmt.format(bday)}</p>
                    <p className="text-[10px] text-slate-500">{daysAway === 0 ? "today!" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`}</p>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Live disciplinary cases */}
        <Card>
          <CardHeader>
            <CardTitle><Shield className="h-4 w-4 inline mr-1 text-rose-600" /> Live disciplinary cases</CardTitle>
            <Badge tone={openCases.length === 0 ? "success" : "warning"}>{openCases.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {openCases.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No active cases in your class. Nice.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {openCases.map(c => (
                  <Link key={c.id} href={`/portal/teacher/discipline/${c.id}`} className="block px-4 py-2.5 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-brand-900 text-sm truncate">{c.student.user.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge>
                        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{CATEGORY_LABEL[c.category]} · {dateFmt.format(c.incidentDate)}</p>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent notes */}
        <Card>
          <CardHeader>
            <CardTitle><MessageSquarePlus className="h-4 w-4 inline mr-1" /> Recent observations</CardTitle>
            <Badge tone="neutral">{recentNotes.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {recentNotes.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No recent staff notes on your students.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                {recentNotes.map(n => (
                  <div key={n.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/portal/teacher/students/${n.studentId}`} className="font-medium text-brand-900 text-sm truncate hover:underline">{n.student.user.name}</Link>
                      <span className="text-[10px] text-slate-500 shrink-0">{dateFmt.format(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">— {n.authorName}{n.authorRole && ` · ${n.authorRole.toLowerCase()}`}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Outstanding fees in class */}
      {term && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle><Wallet className="h-4 w-4 inline mr-1" /> Outstanding fees (this term)</CardTitle>
            <Badge tone={outstandingFees.length === 0 ? "success" : "warning"}>{outstandingFees.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {outstandingFees.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">Every student in your class is paid up. Lovely.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Student</th>
                    <th className="text-left px-4 py-2 font-medium">Fee</th>
                    <th className="text-right px-4 py-2 font-medium">Billed</th>
                    <th className="text-right px-4 py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingFees.map(f => (
                    <tr key={f.id} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        <Link href={`/portal/teacher/students/${f.studentId}`} className="font-medium text-brand-900 hover:underline">{f.student.user.name}</Link>
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-700">{f.feeType}</td>
                      <td className="px-4 py-2 text-right text-slate-700">{nairaFmt.format(Number(f.amount))}</td>
                      <td className="px-4 py-2 text-right font-semibold text-rose-700">{nairaFmt.format(Number(f.balance))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
