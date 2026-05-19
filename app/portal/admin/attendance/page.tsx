import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { CheckSquare, Users, AlertCircle, CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { weekday: "long", year: "numeric", month: "short", day: "numeric" });

type SearchParams = { date?: string };

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();

  const dateStr = searchParams.date ?? isoDate(new Date());
  const date = new Date(dateStr + "T00:00:00.000Z");

  const [classes, dayRecords, termRecords, totalStudents] = await Promise.all([
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }], include: { _count: { select: { students: true } } } }),
    prisma.attendance.findMany({
      where: { date },
      select: { studentId: true, classId: true, status: true },
    }),
    term ? prisma.attendance.findMany({
      where: { termId: term.id },
      select: { studentId: true, status: true, classId: true },
    }) : Promise.resolve([]),
    prisma.student.count(),
  ]);

  // Aggregate per class for the chosen date
  const dayByClass = new Map<string, { present: number; absent: number; late: number; total: number }>();
  for (const r of dayRecords) {
    const cur = dayByClass.get(r.classId) ?? { present: 0, absent: 0, late: 0, total: 0 };
    cur.total++;
    if (r.status === "PRESENT") cur.present++;
    else if (r.status === "ABSENT") cur.absent++;
    else if (r.status === "LATE") cur.late++;
    dayByClass.set(r.classId, cur);
  }

  // School-wide stats for the day
  const schoolDay = dayRecords.reduce(
    (acc, r) => {
      acc.total++;
      if (r.status === "PRESENT") acc.present++;
      else if (r.status === "ABSENT") acc.absent++;
      else if (r.status === "LATE") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0, total: 0 },
  );
  const dayPct = schoolDay.total > 0 ? Math.round((schoolDay.present / schoolDay.total) * 100) : 0;
  const unmarked = totalStudents - schoolDay.total;

  // School-wide term stats
  const termPresent = termRecords.filter(r => r.status === "PRESENT").length;
  const termPct = termRecords.length > 0 ? Math.round((termPresent / termRecords.length) * 100) : 0;

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Attendance Overview</h1>
          <p className="text-sm text-slate-500">{dateFmt.format(date)}</p>
        </div>
        <form action="" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium px-4 py-2 rounded-lg">Load</button>
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Today" value={`${dayPct}%`} hint={`${schoolDay.present} present`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Absent" value={schoolDay.absent} accent="rose" />
        <StatCard label="Late" value={schoolDay.late} accent="amber" />
        <StatCard label="Unmarked" value={Math.max(0, unmarked)} hint="not registered today" icon={<AlertCircle className="h-5 w-5" />} accent="sky" />
        <StatCard label="Term avg" value={`${termPct}%`} hint={`${termRecords.length} records`} icon={<CheckSquare className="h-5 w-5" />} accent="brand" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per class — {dateFmt.format(date)}</CardTitle>
          <Badge tone="neutral">{classes.length} classes</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Class</th>
                <th className="text-right px-4 py-2.5 font-medium">Enrolled</th>
                <th className="text-right px-4 py-2.5 font-medium">Marked</th>
                <th className="text-right px-4 py-2.5 font-medium">Present</th>
                <th className="text-right px-4 py-2.5 font-medium">Absent</th>
                <th className="text-right px-4 py-2.5 font-medium">Late</th>
                <th className="text-right px-4 py-2.5 font-medium">Rate</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {classes.map(c => {
                const day = dayByClass.get(c.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
                const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0;
                const enrolled = c._count.students;
                const marked = day.total;
                return (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-brand-900">{c.name}{c.arm}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700"><Users className="h-3.5 w-3.5 inline mr-0.5 text-slate-400" />{enrolled}</td>
                    <td className="px-4 py-2.5 text-right">
                      {marked === enrolled && marked > 0 ? <Badge tone="success">{marked}</Badge> : marked === 0 ? <Badge tone="neutral">0</Badge> : <Badge tone="warning">{marked}</Badge>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-700 font-medium">{day.present}</td>
                    <td className="px-4 py-2.5 text-right text-rose-700">{day.absent}</td>
                    <td className="px-4 py-2.5 text-right text-amber-700">{day.late}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-brand-900">{marked > 0 ? `${rate}%` : "—"}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/portal/admin/attendance/class/${c.id}?date=${dateStr}`} className="text-xs text-brand-700 font-medium hover:underline whitespace-nowrap">Detail →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
