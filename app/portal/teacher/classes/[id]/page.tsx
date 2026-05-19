import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { ArrowLeft, Users, CheckSquare, FileText, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type Props = { params: { id: string } };

export default async function TeacherClassRosterPage({ params }: Props) {
  const teacher = await getCurrentTeacher();
  const { term } = await getActiveContext();

  // Authorization: this class must be one this teacher is assigned to or
  // form-teacher of. Otherwise redirect — they shouldn't see other classes.
  const allowed = new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]);
  if (!allowed.has(params.id)) redirect("/portal/teacher/classes");

  const cls = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      classTeacher: { include: { user: { select: { name: true } } } },
      subjects: { include: { subject: { select: { code: true, name: true } } } },
    },
  });
  if (!cls) notFound();

  const students = await prisma.student.findMany({
    where: { classId: cls.id },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true } },
      parentLinks: { include: { parent: { include: { user: { select: { name: true, phone: true } } } } } },
    },
    orderBy: { admissionNumber: "asc" },
  });

  // Per-student attendance + score aggregates for the active term.
  const studentIds = students.map(s => s.id);
  const [attRows, resultRows] = term ? await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, termId: term.id },
      select: { studentId: true, status: true },
    }),
    prisma.result.findMany({
      where: { studentId: { in: studentIds }, termId: term.id },
      select: { studentId: true, total: true, isPublished: true },
    }),
  ]) : [[], []];

  const attBy = new Map<string, { present: number; total: number }>();
  for (const r of attRows) {
    const cur = attBy.get(r.studentId) ?? { present: 0, total: 0 };
    cur.total++;
    if (r.status === "PRESENT") cur.present++;
    attBy.set(r.studentId, cur);
  }

  const scoreBy = new Map<string, { sum: number; count: number }>();
  for (const r of resultRows) {
    const cur = scoreBy.get(r.studentId) ?? { sum: 0, count: 0 };
    cur.sum += r.total;
    cur.count++;
    scoreBy.set(r.studentId, cur);
  }

  const isFormTeacher = teacher.classTeacherOf.some(x => x.id === cls.id);

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/portal/teacher/classes" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{cls.name}{cls.arm}</h1>
            <p className="text-sm text-slate-500">
              {isFormTeacher && <Badge tone="gold" className="mr-1">Form teacher</Badge>}
              {cls.classTeacher && !isFormTeacher && <>Form teacher: {cls.classTeacher.user.name} · </>}
              {students.length} student{students.length === 1 ? "" : "s"}
              {term && <> · {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/portal/teacher/attendance?classId=${cls.id}`} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-lg">
            <CheckSquare className="h-4 w-4" /> Mark attendance
          </Link>
          <Link href={`/portal/teacher/results?classId=${cls.id}`} className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
            <FileText className="h-4 w-4" /> Enter scores
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={students.length} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Boys" value={students.filter(s => s.gender === "MALE").length} accent="sky" />
        <StatCard label="Girls" value={students.filter(s => s.gender === "FEMALE").length} accent="rose" />
        <StatCard label="Subjects taught" value={cls.subjects.length} accent="gold" />
      </div>

      <Card>
        <CardHeader><CardTitle>Student roster</CardTitle><Badge tone="neutral">{students.length}</Badge></CardHeader>
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No students enrolled in this class.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Adm #</th>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Gender</th>
                    <th className="text-right px-4 py-2.5 font-medium">Attendance</th>
                    <th className="text-right px-4 py-2.5 font-medium">Term avg</th>
                    <th className="text-left px-4 py-2.5 font-medium">Parent contact</th>
                    <th className="text-right px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const a = attBy.get(s.id) ?? { present: 0, total: 0 };
                    const rate = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
                    const sc = scoreBy.get(s.id);
                    const avg = sc && sc.count > 0 ? Math.round((sc.sum / sc.count) * 10) / 10 : null;
                    const photoUrl = s.photoUrl ?? s.user.image ?? null;
                    const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                    const parent = s.parentLinks[0]?.parent;
                    return (
                      <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">{s.admissionNumber}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/portal/teacher/students/${s.id}`} className="flex items-center gap-2 hover:text-brand-700">
                            <span className="relative h-7 w-7 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {photoUrl ? <img src={photoUrl} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                            </span>
                            <span className="font-medium text-slate-900">{s.user.name}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-[12px]">{s.gender ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{a.total > 0 ? `${rate}%` : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{avg !== null ? avg : "—"}</td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-600">
                          {parent ? (
                            <>
                              <div>{parent.user.name}</div>
                              {parent.user.phone && <div className="text-slate-400">{parent.user.phone}</div>}
                            </>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Link href={`/portal/teacher/students/${s.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline whitespace-nowrap">
                            Detail <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
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
