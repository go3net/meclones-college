import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { deleteClass } from "./actions";
import { GraduationCap, Plus, CheckCircle2, AlertCircle, Users, BookOpen, Edit, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { added?: string; updated?: string; deleted?: string; error?: string };

export default async function AdminClassesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    include: {
      classTeacher: { include: { user: { select: { name: true } } } },
      subjects: { include: { subject: { select: { code: true, name: true } } } },
      _count: { select: { students: true } },
    },
  });

  const jss = classes.filter(c => c.level === "JSS");
  const sss = classes.filter(c => c.level === "SSS");
  const totalStudents = classes.reduce((s, c) => s + c._count.students, 0);

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Classes</h1>
          <p className="text-sm text-slate-500">Manage the school's classes — assign teachers, link subjects.</p>
        </div>
        <Link href="/portal/admin/classes/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> New Class
        </Link>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Class "{decodeURIComponent(searchParams.added)}" created.
        </div>
      )}
      {searchParams.updated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Class "{decodeURIComponent(searchParams.updated)}" updated.
        </div>
      )}
      {searchParams.deleted && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Class deleted.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total classes" value={classes.length} icon={<GraduationCap className="h-5 w-5" />} accent="brand" />
        <StatCard label="JSS classes" value={jss.length} accent="sky" />
        <StatCard label="SS classes" value={sss.length} accent="emerald" />
        <StatCard label="Total students" value={totalStudents} icon={<Users className="h-5 w-5" />} accent="gold" />
      </div>

      <Card>
        <CardHeader><CardTitle>All classes</CardTitle></CardHeader>
        <CardBody className="p-0">
          {classes.length === 0 ? (
            <div className="py-12 text-center">
              <GraduationCap className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No classes yet</p>
              <p className="text-sm text-slate-500 mt-1">Click "New Class" to add the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Level</th>
                    <th className="text-left px-4 py-2.5 font-medium">Form teacher</th>
                    <th className="text-left px-4 py-2.5 font-medium">Subjects</th>
                    <th className="text-right px-4 py-2.5 font-medium">Students</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map(c => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-brand-900">{c.name}{c.arm}</td>
                      <td className="px-4 py-2.5"><Badge tone={c.level === "JSS" ? "info" : "gold"}>{c.level}</Badge></td>
                      <td className="px-4 py-2.5 text-slate-700">{c.classTeacher?.user.name ?? <span className="text-slate-400 text-xs">Unassigned</span>}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {c.subjects.length === 0 ? <span className="text-xs text-slate-400">—</span> : c.subjects.map(s => (
                            <Badge key={s.subject.code} tone="neutral">{s.subject.code}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{c._count.students}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/portal/admin/classes/${c.id}/edit`} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50 px-2 py-1 rounded">
                            <Edit className="h-3 w-3" /> Edit
                          </Link>
                          {c._count.students === 0 && (
                            <form action={deleteClass}>
                              <input type="hidden" name="id" value={c.id} />
                              <button type="submit" className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 px-2 py-1 rounded">
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </form>
                          )}
                        </div>
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
