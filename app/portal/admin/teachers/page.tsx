import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { GraduationCap, Plus, Search, CheckCircle2, BookOpen, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { q?: string; subjectId?: string; added?: string };

export default async function AdminTeachersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "SUPER_ADMIN", "DIRECTOR"]);

  const q = (searchParams.q ?? "").trim();
  const subjectFilter = (searchParams.subjectId ?? "").trim();

  const [subjects, totalTeachers, formTeacherCount] = await Promise.all([
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { teachers: true } } },
    }),
    prisma.teacher.count(),
    prisma.class.count({ where: { classTeacherId: { not: null } } }),
  ]);

  const where = {
    ...(subjectFilter ? { subjects: { some: { subjectId: subjectFilter } } } : {}),
    ...(q ? {
      user: {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
        ],
      },
    } : {}),
  };

  const teachers = await prisma.teacher.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true } },
      subjects: { include: { subject: { select: { name: true, code: true } } } },
      classes: { include: { class: { select: { name: true, arm: true } } } },
      classTeacherOf: { select: { name: true, arm: true } },
    },
    take: 200,
  });

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Teachers</h1>
          <p className="text-sm text-slate-500">{totalTeachers} faculty members · {formTeacherCount} form teachers</p>
        </div>
        <Link href="/portal/admin/teachers/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> Add Teacher
        </Link>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Teacher {searchParams.added} registered.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total" value={totalTeachers} hint="active faculty" icon={<GraduationCap className="h-5 w-5" />} accent="brand" />
        <StatCard label="Form Teachers" value={formTeacherCount} hint={`of ${subjects.length} subjects taught`} icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Subjects" value={subjects.length} hint="in curriculum" icon={<BookOpen className="h-5 w-5" />} accent="sky" />
        <StatCard label="Avg. subjects / teacher" value={totalTeachers > 0 ? (subjects.reduce((s, x) => s + x._count.teachers, 0) / totalTeachers).toFixed(1) : "0"} accent="gold" />
      </div>

      {/* Subject filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Link
          href="/portal/admin/teachers"
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!subjectFilter ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
        >
          All
        </Link>
        {subjects.map(s => {
          const active = subjectFilter === s.id;
          return (
            <Link
              key={s.id}
              href={`/portal/admin/teachers?subjectId=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${active ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
            >
              {s.code} <span className={`ml-1 ${active ? "text-brand-100" : "text-slate-400"}`}>({s._count.teachers})</span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <Card className="mb-4">
        <CardBody className="py-3">
          <form action="/portal/admin/teachers" method="GET" className="flex items-center gap-2">
            {subjectFilter && <input type="hidden" name="subjectId" value={subjectFilter} />}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Search</button>
            {(q || subjectFilter) && (
              <Link href="/portal/admin/teachers" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Clear</Link>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {subjectFilter ? `Teachers of ${subjects.find(s => s.id === subjectFilter)?.name ?? "—"}` : "All teachers"}
          </CardTitle>
          <Badge tone="neutral">{teachers.length} shown</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {teachers.length === 0 ? (
            <div className="py-16 text-center">
              <GraduationCap className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No teachers match</p>
              <p className="text-sm text-slate-500 mt-1">Try clearing the filter, or click "Add Teacher" to register a new one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Contact</th>
                    <th className="text-left px-4 py-2.5 font-medium">Subjects</th>
                    <th className="text-left px-4 py-2.5 font-medium">Classes</th>
                    <th className="text-left px-4 py-2.5 font-medium">Form teacher</th>
                    <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <Link href={`/portal/admin/teachers/${t.id}/edit`} className="hover:text-brand-700 flex items-center gap-2">
                          {(() => {
                            const url = t.user.image ?? null;
                            const initials = t.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                            return (
                              <span className="relative h-7 w-7 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {url ? <img src={url} alt={t.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                              </span>
                            );
                          })()}
                          <span>{t.user.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">
                        <div>{t.user.email}</div>
                        {t.user.phone && <div className="text-slate-400">{t.user.phone}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            t.subjects.map(s => <Badge key={s.subject.code} tone="info">{s.subject.code}</Badge>)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {t.classes.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            t.classes.map(c => <Badge key={c.class.name + c.class.arm} tone="neutral">{c.class.name}{c.class.arm}</Badge>)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {t.classTeacherOf.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <Badge tone="gold">{t.classTeacherOf.map(c => `${c.name}${c.arm}`).join(", ")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(t.createdAt)}</td>
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
