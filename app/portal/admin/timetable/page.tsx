import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { TimetableGrid, DEFAULT_PERIOD_TIMES } from "@/components/TimetableGrid";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { setTimetableCell } from "./actions";
import { Calendar, CheckCircle2, AlertCircle, Eraser } from "lucide-react";

export const dynamic = "force-dynamic";

const PERIODS = 8;
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"] as const;

type SearchParams = { classId?: string; saved?: string; cleared?: string; error?: string };

export default async function AdminTimetablePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });
  const selectedClassId = searchParams.classId && classes.some(c => c.id === searchParams.classId)
    ? searchParams.classId
    : classes[0]?.id ?? "";

  const [subjects, teachers, entries] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    selectedClassId ? prisma.timetableEntry.findMany({
      where: { classId: selectedClassId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    }) : Promise.resolve([]),
  ]);

  // For the subject filter — only show subjects this class teaches if mapped,
  // otherwise show all.
  const classSubjectIds = await prisma.classSubject.findMany({
    where: { classId: selectedClassId },
    select: { subjectId: true },
  });
  const allowedSubjectIds = new Set(classSubjectIds.map(c => c.subjectId));
  const subjectOptions = subjects.filter(s => allowedSubjectIds.size === 0 || allowedSubjectIds.has(s.id));

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Timetable</h1>
        <p className="text-sm text-slate-500">Build a weekly class timetable — pick a subject + teacher for each period.</p>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Cell saved.
        </div>
      )}
      {searchParams.cleared && (
        <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-700 flex items-center gap-2">
          <Eraser className="h-4 w-4" /> Cell cleared.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card className="mb-4">
        <CardBody className="py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-600">Class:</span>
          <div className="flex flex-wrap gap-1.5">
            {classes.length === 0 ? (
              <span className="text-xs text-slate-400">No classes yet — create one under Admin → Classes first.</span>
            ) : classes.map(c => (
              <Link
                key={c.id}
                href={`/portal/admin/timetable?classId=${c.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selectedClassId === c.id ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
              >
                {c.name}{c.arm}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      {selectedClassId && (
        <Card>
          <CardHeader>
            <CardTitle><Calendar className="h-4 w-4 inline mr-1" /> Weekly grid</CardTitle>
            <Badge tone="neutral">{entries.length} cells filled · auto-saves on change</Badge>
          </CardHeader>
          <CardBody className="p-0">
            <TimetableGrid
              entries={entries.map(e => ({
                id: e.id,
                day: e.day,
                period: e.period,
                subject: e.subject ?? null,
                teacher: e.teacher ?? null,
                startTime: e.startTime,
                endTime: e.endTime,
                room: e.room,
                note: e.note,
              }))}
              periods={PERIODS}
              days={[...DAYS]}
              renderCell={({ day, period, entry }) => {
                const defaults = DEFAULT_PERIOD_TIMES[period - 1];
                return (
                  <form action={setTimetableCell} className="space-y-1.5 min-w-[150px]">
                    <input type="hidden" name="classId" value={selectedClassId} />
                    <input type="hidden" name="day" value={day} />
                    <input type="hidden" name="period" value={period} />
                    <input type="hidden" name="startTime" value={entry?.startTime ?? defaults?.startTime ?? ""} />
                    <input type="hidden" name="endTime" value={entry?.endTime ?? defaults?.endTime ?? ""} />

                    <select
                      name="subjectId"
                      defaultValue={entry?.subject?.id ?? ""}
                      className="w-full text-[11px] border border-slate-300 rounded px-1.5 py-1 bg-white"
                    >
                      <option value="">— Free —</option>
                      {subjectOptions.map(s => (
                        <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                      ))}
                    </select>

                    <select
                      name="teacherId"
                      defaultValue={entry?.teacher?.id ?? ""}
                      className="w-full text-[10px] border border-slate-300 rounded px-1.5 py-1 bg-white"
                    >
                      <option value="">— Teacher —</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.user.name}</option>
                      ))}
                    </select>

                    <input
                      name="note"
                      defaultValue={entry?.note ?? ""}
                      placeholder="Note (e.g. Break)"
                      className="w-full text-[10px] border border-slate-300 rounded px-1.5 py-1"
                    />

                    <button
                      type="submit"
                      className="w-full text-[10px] font-semibold bg-brand-700 hover:bg-brand-800 text-white rounded py-1"
                    >
                      Save
                    </button>
                  </form>
                );
              }}
            />
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
