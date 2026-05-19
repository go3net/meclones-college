import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { TimetableGrid, DEFAULT_PERIOD_TIMES } from "@/components/TimetableGrid";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/auth-helpers";
import { Calendar, Clock, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

const PERIODS = 8;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"] as const;

export default async function TeacherTimetablePage() {
  const teacher = await getCurrentTeacher();

  const entries = await prisma.timetableEntry.findMany({
    where: { teacherId: teacher.id },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true, arm: true } },
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });

  // Distinct classes + total weekly load.
  const classes = new Set(entries.map(e => `${e.class.name}${e.class.arm}`));
  const periodsPerDay = new Map<string, number>();
  for (const e of entries) {
    periodsPerDay.set(e.day, (periodsPerDay.get(e.day) ?? 0) + 1);
  }

  // Build grid entries where the "label" is the class name (since the teacher
  // teaches different classes in different cells).
  const gridEntries = entries.map(e => ({
    id: e.id,
    day: e.day,
    period: e.period,
    subject: e.subject ? { id: e.subject.id, name: e.subject.name, code: e.subject.code } : null,
    teacher: null,
    startTime: e.startTime,
    endTime: e.endTime,
    room: e.room,
    note: e.note ? e.note : `${e.class.name}${e.class.arm}${e.subject ? "" : ""}`,
  }));

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">My Schedule</h1>
        <p className="text-sm text-slate-500">
          {entries.length} period{entries.length === 1 ? "" : "s"} per week · {classes.size} class{classes.size === 1 ? "" : "es"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Periods / week" value={entries.length} icon={<Clock className="h-5 w-5" />} accent="brand" />
        <StatCard label="Classes" value={classes.size} icon={<ClipboardList className="h-5 w-5" />} accent="sky" />
        <StatCard label="Subjects" value={new Set(entries.filter(e => e.subject).map(e => e.subject!.id)).size} accent="emerald" />
        <StatCard label="Busiest day" value={[...periodsPerDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]?.slice(0, 3) ?? "—"} hint={`${[...periodsPerDay.values()].sort((a, b) => b - a)[0] ?? 0} periods`} accent="gold" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle><Calendar className="h-4 w-4 inline mr-1" /> Weekly grid</CardTitle>
          <Badge tone="neutral">Mon – Fri</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {/* Use a custom renderer so cells show subject + class instead of teacher. */}
          <TimetableGrid
            entries={gridEntries}
            periods={PERIODS}
            days={[...DAYS]}
            hideTeacher
            renderCell={({ day, period }) => {
              const e = entries.find(x => x.day === day && x.period === period);
              if (!e) {
                return (
                  <div className="rounded-md p-2 bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 text-center min-h-[44px] flex items-center justify-center">
                    —
                  </div>
                );
              }
              return (
                <div className="rounded-md p-2 bg-gold-50 border border-gold-200 min-w-[140px]">
                  <div className="font-semibold text-brand-900 text-xs leading-tight">
                    {e.subject?.name ?? (e.note || "—")}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    <Badge tone="gold">{e.class.name}{e.class.arm}</Badge>
                  </div>
                  {e.room && <div className="text-[10px] text-slate-500 mt-1">Room {e.room}</div>}
                </div>
              );
            }}
          />
        </CardBody>
      </Card>
    </PortalShell>
  );
}
