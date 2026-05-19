import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { TimetableGrid } from "@/components/TimetableGrid";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth-helpers";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentTimetablePage() {
  const student = await getCurrentStudent();

  if (!student.classId) {
    return (
      <PortalShell role="student">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Timetable</h1>
          <p className="text-sm text-slate-500">No class assigned yet — ask the school office.</p>
        </div>
      </PortalShell>
    );
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
  });

  return (
    <PortalShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">My Timetable</h1>
        <p className="text-sm text-slate-500">
          {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned"} · {entries.length} period{entries.length === 1 ? "" : "s"} scheduled
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><Calendar className="h-4 w-4 inline mr-1" /> Weekly schedule</CardTitle>
          <Badge tone="neutral">Mon – Fri</Badge>
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
          />
        </CardBody>
      </Card>
    </PortalShell>
  );
}
