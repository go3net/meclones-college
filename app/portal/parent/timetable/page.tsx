import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { TimetableGrid } from "@/components/TimetableGrid";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { Calendar, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { student?: string };

export default async function ParentTimetablePage({ searchParams }: { searchParams: SearchParams }) {
  const parent = await getCurrentParentWithChildren();
  const children = parent.children.map(c => c.student);

  if (children.length === 0) {
    return (
      <PortalShell role="parent">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No children linked yet</p>
          <p className="text-sm text-slate-500 mt-1">Contact the school office to link your child's account.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selected = searchParams.student
    ? children.find(c => c.id === searchParams.student) ?? children[0]
    : children[0];

  const entries = selected.classId ? await prisma.timetableEntry.findMany({
    where: { classId: selected.classId },
    include: {
      subject: { select: { id: true, name: true, code: true } },
      teacher: { include: { user: { select: { name: true } } } },
    },
  }) : [];

  return (
    <PortalShell role="parent">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Timetable</h1>
        <p className="text-sm text-slate-500">
          {selected.user.name}
          {selected.classRef && ` · ${selected.classRef.name}${selected.classRef.arm}`}
          {` · ${entries.length} period${entries.length === 1 ? "" : "s"} scheduled`}
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {children.map(c => (
            <Link
              key={c.id}
              href={`/portal/parent/timetable?student=${c.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${c.id === selected.id ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
            >
              {c.user.name}
            </Link>
          ))}
        </div>
      )}

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
