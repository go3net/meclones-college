import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { ArrowRight, Users, GraduationCap, ClipboardList } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const teacher = await getCurrentTeacher();
  const { term } = await getActiveContext();

  // Every class this teacher can see: form-teacher of, or assigned via
  // ClassTeacher join.
  const myClassIds = Array.from(new Set([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]));

  if (myClassIds.length === 0) {
    return (
      <PortalShell role="teacher">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">My Classes</h1>
        </div>
        <Card><CardBody className="py-12 text-center">
          <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No classes assigned</p>
          <p className="text-sm text-slate-500 mt-1">Ask the school admin to assign you to a class.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const classes = await prisma.class.findMany({
    where: { id: { in: myClassIds } },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    include: {
      _count: { select: { students: true } },
      subjects: { include: { subject: { select: { code: true, name: true } } } },
    },
  });

  // For each class, fetch attendance stats this term + the gender split.
  const termAttendance = term && myClassIds.length > 0 ? await prisma.attendance.findMany({
    where: { classId: { in: myClassIds }, termId: term.id },
    select: { classId: true, status: true },
  }) : [];

  const attByClass = new Map<string, { present: number; total: number }>();
  for (const r of termAttendance) {
    const cur = attByClass.get(r.classId) ?? { present: 0, total: 0 };
    cur.total++;
    if (r.status === "PRESENT") cur.present++;
    attByClass.set(r.classId, cur);
  }

  const genderByClass = await prisma.student.groupBy({
    by: ["classId", "gender"],
    where: { classId: { in: myClassIds } },
    _count: { _all: true },
  });
  const genderMap = new Map<string, { MALE: number; FEMALE: number }>();
  for (const row of genderByClass) {
    if (!row.classId) continue;
    const cur = genderMap.get(row.classId) ?? { MALE: 0, FEMALE: 0 };
    if (row.gender === "MALE") cur.MALE = row._count._all;
    else if (row.gender === "FEMALE") cur.FEMALE = row._count._all;
    genderMap.set(row.classId, cur);
  }

  const totalStudents = classes.reduce((s, c) => s + c._count.students, 0);

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">My Classes</h1>
        <p className="text-sm text-slate-500">
          {classes.length} class{classes.length === 1 ? "" : "es"} · {totalStudents} student{totalStudents === 1 ? "" : "s"} you teach
          {term && <> · {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term</>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Classes" value={classes.length} icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard label="Students" value={totalStudents} icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Form-teacher" value={teacher.classTeacherOf.length} icon={<GraduationCap className="h-5 w-5" />} accent="gold" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {classes.map(c => {
          const a = attByClass.get(c.id) ?? { present: 0, total: 0 };
          const rate = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
          const g = genderMap.get(c.id) ?? { MALE: 0, FEMALE: 0 };
          const isForm = teacher.classTeacherOf.some(x => x.id === c.id);

          return (
            <Card key={c.id} className="hover:shadow-lift transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{c.name}{c.arm}</CardTitle>
                  <Badge tone={c.level === "JSS" ? "info" : "gold"}>{c.level}</Badge>
                  {isForm && <Badge tone="gold">Form teacher</Badge>}
                </div>
                <Badge tone="neutral">{c._count.students} students</Badge>
              </CardHeader>
              <CardBody>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Boys / Girls</dt><dd className="font-medium">{g.MALE} / {g.FEMALE}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Term attendance</dt><dd className="font-medium">{a.total > 0 ? `${rate}%` : "—"}</dd></div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500 shrink-0">Subjects</dt>
                    <dd className="flex flex-wrap gap-1 justify-end">
                      {c.subjects.length === 0 ? <span className="text-xs text-slate-400">none</span> : c.subjects.map(s => (
                        <Badge key={s.subject.code} tone="neutral">{s.subject.code}</Badge>
                      ))}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <Link href={`/portal/teacher/classes/${c.id}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:text-brand-900 font-medium text-sm">
                    View roster <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </PortalShell>
  );
}
