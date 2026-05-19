import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { CalendarCheck, ArrowLeft, AlertCircle, CheckCircle2, X } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { weekday: "long", year: "numeric", month: "short", day: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "short" });

type Props = { params: { id: string }; searchParams: { date?: string } };

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const statusColor: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PRESENT: "success",
  LATE: "warning",
  ABSENT: "danger",
};

export default async function ClassAttendanceDetailPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      classTeacher: { include: { user: { select: { name: true } } } },
    },
  });
  if (!cls) notFound();

  const dateStr = searchParams.date ?? isoDate(new Date());
  const date = new Date(dateStr + "T00:00:00.000Z");

  // All students in this class + their attendance for the chosen day +
  // their term-to-date attendance totals.
  const [students, dayRecords, termRecords] = await Promise.all([
    prisma.student.findMany({
      where: { classId: cls.id },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { admissionNumber: "asc" },
    }),
    prisma.attendance.findMany({
      where: { classId: cls.id, date },
      include: { markedBy: { include: { user: { select: { name: true } } } } },
    }),
    term ? prisma.attendance.findMany({
      where: { classId: cls.id, termId: term.id },
      select: { studentId: true, status: true },
    }) : Promise.resolve([]),
  ]);

  const todayByStudent = new Map(dayRecords.map(r => [r.studentId, r]));
  const termByStudent = new Map<string, { present: number; absent: number; late: number; total: number }>();
  for (const r of termRecords) {
    const cur = termByStudent.get(r.studentId) ?? { present: 0, absent: 0, late: 0, total: 0 };
    cur.total++;
    if (r.status === "PRESENT") cur.present++;
    else if (r.status === "ABSENT") cur.absent++;
    else if (r.status === "LATE") cur.late++;
    termByStudent.set(r.studentId, cur);
  }

  // Day stats
  const dayCounts = dayRecords.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "PRESENT") acc.present++;
      else if (r.status === "ABSENT") acc.absent++;
      else if (r.status === "LATE") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, total: 0 },
  );
  const unmarked = students.length - dayCounts.total;
  const dayPct = dayCounts.total > 0 ? Math.round((dayCounts.present / dayCounts.total) * 100) : 0;

  // Marker name for the day (typically all rows from one teacher)
  const marker = dayRecords.find(r => r.markedBy)?.markedBy?.user.name;

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/portal/admin/attendance?date=${dateStr}`} className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-brand-900">{cls.name}{cls.arm} attendance</h1>
          <p className="text-sm text-slate-500">
            {dateFmt.format(date)}
            {cls.classTeacher && <> · Form teacher: {cls.classTeacher.user.name}</>}
            {marker && <> · Marked by {marker}</>}
          </p>
        </div>
        <form action="" className="flex items-center gap-2">
          <input type="date" name="date" defaultValue={dateStr} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium px-4 py-2 rounded-lg">Load</button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Enrolled" value={students.length} icon={<CalendarCheck className="h-5 w-5" />} accent="brand" />
        <StatCard label="Marked" value={dayCounts.total} hint={`${unmarked} unmarked`} accent={unmarked > 0 ? "amber" : "emerald"} />
        <StatCard label="Present" value={dayCounts.present} accent="emerald" />
        <StatCard label="Absent" value={dayCounts.absent} accent="rose" />
        <StatCard label="Day rate" value={dayCounts.total > 0 ? `${dayPct}%` : "—"} accent="gold" />
      </div>

      {dayCounts.total === 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-900 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> No attendance has been marked for this class on {shortDateFmt.format(date)}. Ask the form teacher to mark it from <Link href="/portal/teacher/attendance" className="font-medium underline">Mark Attendance</Link>.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student roster ({students.length})</CardTitle>
          {term && <Badge tone="neutral">Term-to-date {dateFmt.format(date)}</Badge>}
        </CardHeader>
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No students enrolled in this class yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Admission #</th>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Today</th>
                    <th className="text-right px-4 py-2.5 font-medium">Term Present</th>
                    <th className="text-right px-4 py-2.5 font-medium">Absent</th>
                    <th className="text-right px-4 py-2.5 font-medium">Late</th>
                    <th className="text-right px-4 py-2.5 font-medium">Term rate</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const day = todayByStudent.get(s.id);
                    const t = termByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
                    const rate = t.total > 0 ? Math.round((t.present / t.total) * 100) : 0;
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">
                          <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">{s.admissionNumber}</Link>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{s.user.name}</td>
                        <td className="px-4 py-2.5">
                          {day ? (
                            <Badge tone={statusColor[day.status]}>{day.status.toLowerCase()}</Badge>
                          ) : (
                            <span className="text-xs text-slate-400 inline-flex items-center gap-1"><X className="h-3 w-3" /> unmarked</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">{t.present}</td>
                        <td className="px-4 py-2.5 text-right text-rose-700">{t.absent}</td>
                        <td className="px-4 py-2.5 text-right text-amber-700">{t.late}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-brand-900">{t.total > 0 ? `${rate}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
