import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent, getActiveContext } from "@/lib/auth-helpers";
import { CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

export default async function StudentAttendancePage() {
  const student = await getCurrentStudent();
  const { term, session } = await getActiveContext();

  const where = term
    ? { studentId: student.id, termId: term.id }
    : { studentId: student.id };

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: "desc" },
    take: 90,
  });

  const counts = records.reduce(
    (acc, r) => {
      if (r.status === "PRESENT") acc.present++;
      else if (r.status === "ABSENT") acc.absent++;
      else if (r.status === "LATE") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );
  const total = counts.present + counts.absent + counts.late;
  const pct = total > 0 ? Math.round((counts.present / total) * 100) : 0;

  return (
    <PortalShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">My Attendance</h1>
        <p className="text-sm text-slate-500">
          {term ? `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term` : ""}
          {session ? ` · Session ${session.name}` : ""}
          {student.classRef && ` · ${student.classRef.name}${student.classRef.arm}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Overall" value={`${pct}%`} hint={`${total} days recorded`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Present" value={counts.present} accent="emerald" />
        <StatCard label="Absent" value={counts.absent} accent="rose" />
        <StatCard label="Late" value={counts.late} accent="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent days ({records.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {records.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No attendance recorded yet for this term.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">{dateFmt.format(r.date)}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={r.status === "PRESENT" ? "success" : r.status === "ABSENT" ? "danger" : "warning"}>
                          {r.status.toLowerCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
