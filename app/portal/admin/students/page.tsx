import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Users, Plus, Search, CheckCircle2, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { q?: string; classId?: string; added?: string };

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "SUPER_ADMIN", "DIRECTOR"]);

  const q = (searchParams.q ?? "").trim();
  const classFilter = (searchParams.classId ?? "").trim();

  const [classes, totalStudents] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ name: "asc" }, { arm: "asc" }],
      include: { _count: { select: { students: true } } },
    }),
    prisma.student.count(),
  ]);

  const where = {
    ...(classFilter ? { classId: classFilter } : {}),
    ...(q ? {
      OR: [
        { admissionNumber: { contains: q, mode: "insensitive" as const } },
        { user: { name: { contains: q, mode: "insensitive" as const } } },
        { user: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const students = await prisma.student.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, image: true } },
      classRef: { select: { name: true, arm: true } },
    },
    take: 200,
  });

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Students</h1>
          <p className="text-sm text-slate-500">{totalStudents} enrolled across {classes.length} classes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/portal/admin/students/import" className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-brand-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg">
            <Upload className="h-4 w-4" /> Bulk import
          </Link>
          <Link href="/portal/admin/students/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus className="h-4 w-4" /> Add Student
          </Link>
        </div>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Student {searchParams.added} registered.
        </div>
      )}

      {/* Class-by-class card grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <Link href="/portal/admin/students" className={`rounded-xl border p-3 transition ${!classFilter ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">All</p>
          <p className="text-2xl font-bold text-brand-900 mt-0.5">{totalStudents}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">All students</p>
        </Link>
        {classes.map(c => {
          const active = classFilter === c.id;
          return (
            <Link
              key={c.id}
              href={`/portal/admin/students?classId=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-xl border p-3 transition ${active ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{c.level}</p>
              <p className="text-lg font-semibold text-brand-900 mt-0.5">{c.name}{c.arm}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c._count.students} student{c._count.students === 1 ? "" : "s"}</p>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <Card className="mb-4">
        <CardBody className="py-3">
          <form action="/portal/admin/students" method="GET" className="flex items-center gap-2">
            {classFilter && <input type="hidden" name="classId" value={classFilter} />}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search by name, admission number or email..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Search</button>
            {(q || classFilter) && (
              <Link href="/portal/admin/students" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Clear</Link>
            )}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {(() => {
              const selected = classFilter ? classes.find(c => c.id === classFilter) : null;
              return selected ? `${selected.name}${selected.arm}` : "All students";
            })()}
          </CardTitle>
          <Badge tone="neutral">{students.length} shown</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No students match</p>
              <p className="text-sm text-slate-500 mt-1">Try clearing the search or filter, or click "Add Student" to register a new one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Admission #</th>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Gender</th>
                    <th className="text-left px-4 py-2.5 font-medium">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                    <th className="text-right px-4 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">
                        <Link href={`/portal/admin/students/${s.id}`} className="hover:underline">{s.admissionNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <Link href={`/portal/admin/students/${s.id}`} className="hover:text-brand-700 flex items-center gap-2">
                          {(() => {
                            const url = s.photoUrl ?? s.user.image ?? null;
                            const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                            return (
                              <span className="relative h-7 w-7 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {url ? <img src={url} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                              </span>
                            );
                          })()}
                          <span>{s.user.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {s.classRef ? (
                          <Badge tone="neutral">{s.classRef.name}{s.classRef.arm}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">{s.gender ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">{s.user.email}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(s.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/portal/admin/students/${s.id}`} className="text-xs font-medium text-brand-700 hover:underline whitespace-nowrap">View →</Link>
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
