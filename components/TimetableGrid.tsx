import { Badge } from "@/components/ui";
import { Calendar } from "lucide-react";

interface Subject { id: string; name: string; code: string }
interface Teacher { id: string; user: { name: string } }
interface Entry {
  id: string;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  period: number;
  subject: Subject | null;
  teacher: (Teacher & { id: string }) | null;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  note: string | null;
}

interface Props {
  /** Existing entries to render. Sparse — only non-empty cells need to be present. */
  entries: Entry[];
  /** Number of periods to render rows for (default 8). */
  periods?: number;
  /** Days to render columns for (default Mon–Fri). */
  days?: ("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[];
  /** Default period times — index 0 = period 1. */
  defaultTimes?: { startTime: string; endTime: string }[];
  /** When provided, hides the teacher line per cell (useful on the teacher's own schedule). */
  hideTeacher?: boolean;
  /** Optional cell renderer override — used by the admin builder to swap in form-cells. */
  renderCell?: (args: {
    day: Entry["day"];
    period: number;
    entry: Entry | null;
  }) => React.ReactNode;
}

const DAY_LABEL: Record<string, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export const DEFAULT_PERIOD_TIMES = [
  { startTime: "08:00", endTime: "08:40" },
  { startTime: "08:40", endTime: "09:20" },
  { startTime: "09:20", endTime: "10:00" },
  { startTime: "10:00", endTime: "10:40" },
  { startTime: "10:40", endTime: "11:20" }, // typically break
  { startTime: "11:20", endTime: "12:00" },
  { startTime: "12:00", endTime: "12:40" },
  { startTime: "12:40", endTime: "13:20" },
];

export function TimetableGrid({
  entries,
  periods = 8,
  days = ["MON", "TUE", "WED", "THU", "FRI"],
  defaultTimes = DEFAULT_PERIOD_TIMES,
  hideTeacher = false,
  renderCell,
}: Props) {
  // Index entries by `${day}|${period}` for O(1) lookup.
  const byKey = new Map<string, Entry>();
  for (const e of entries) byKey.set(`${e.day}|${e.period}`, e);

  if (entries.length === 0 && !renderCell) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        <Calendar className="h-10 w-10 mx-auto text-slate-300 mb-2" />
        No timetable entries yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="bg-slate-100 text-left px-3 py-2.5 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
              Period
            </th>
            {days.map(d => (
              <th
                key={d}
                className="bg-slate-100 text-left px-3 py-2.5 text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200"
              >
                {DAY_LABEL[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: periods }, (_, i) => i + 1).map(period => {
            const time = defaultTimes[period - 1];
            return (
              <tr key={period} className="border-b border-slate-100">
                <td className="bg-slate-50 px-3 py-2 align-top whitespace-nowrap w-32">
                  <div className="font-semibold text-slate-900 text-xs">Period {period}</div>
                  {time && (
                    <div className="text-[10px] text-slate-500">
                      {time.startTime} – {time.endTime}
                    </div>
                  )}
                </td>
                {days.map(day => {
                  const entry = byKey.get(`${day}|${period}`) ?? null;
                  if (renderCell) {
                    return (
                      <td key={day} className="px-2 py-2 align-top border-l border-slate-100">
                        {renderCell({ day, period, entry })}
                      </td>
                    );
                  }
                  return (
                    <td key={day} className="px-2 py-2 align-top border-l border-slate-100 min-w-[140px]">
                      {entry ? (
                        <div className="rounded-md p-2 bg-brand-50 border border-brand-100">
                          {entry.subject ? (
                            <div className="font-semibold text-brand-900 text-xs leading-tight">
                              {entry.subject.name}
                            </div>
                          ) : (
                            <div className="font-semibold text-slate-700 text-xs italic leading-tight">
                              {entry.note ?? "—"}
                            </div>
                          )}
                          {entry.teacher && !hideTeacher && (
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {entry.teacher.user.name}
                            </div>
                          )}
                          {entry.room && (
                            <Badge tone="neutral" className="mt-1 text-[9px]">{entry.room}</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-md p-2 bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 text-center">
                          Free
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
