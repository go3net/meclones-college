import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { deleteSubject } from "./actions";
import { BookOpen, Plus, CheckCircle2, AlertCircle, Edit, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { added?: string; updated?: string; deleted?: string; error?: string };

export default async function AdminSubjectsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    include: {
      teachers: { include: { teacher: { include: { user: { select: { name: true } } } } } },
      _count: { select: { classes: true, results: true } },
    },
  });

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Subjects</h1>
          <p className="text-sm text-slate-500">Curriculum subjects taught at Meclones — assign teachers per subject.</p>
        </div>
        <Link href="/portal/admin/subjects/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> New Subject
        </Link>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Subject "{decodeURIComponent(searchParams.added)}" added.</div>
      )}
      {searchParams.updated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Subject "{decodeURIComponent(searchParams.updated)}" updated.</div>
      )}
      {searchParams.deleted && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Subject deleted.</div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Subjects" value={subjects.length} icon={<BookOpen className="h-5 w-5" />} accent="brand" />
        <StatCard label="Avg teachers/subject" value={subjects.length > 0 ? (subjects.reduce((s, x) => s + x.teachers.length, 0) / subjects.length).toFixed(1) : "0"} accent="sky" />
        <StatCard label="Total class-links" value={subjects.reduce((s, x) => s + x._count.classes, 0)} accent="emerald" />
        <StatCard label="Result rows" value={subjects.reduce((s, x) => s + x._count.results, 0)} accent="gold" />
      </div>

      <Card>
        <CardHeader><CardTitle>All subjects</CardTitle></CardHeader>
        <CardBody className="p-0">
          {subjects.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No subjects yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Code</th>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Teachers</th>
                    <th className="text-right px-4 py-2.5 font-medium">Classes</th>
                    <th className="text-right px-4 py-2.5 font-medium">Results</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700"><Badge tone="info">{s.code}</Badge></td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {s.teachers.length === 0 ? <span className="text-xs text-slate-400">—</span> : s.teachers.map(t => (
                            <Badge key={t.teacherId} tone="neutral">{t.teacher.user.name.split(" ").slice(-1)[0]}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{s._count.classes}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{s._count.results}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link href={`/portal/admin/subjects/${s.id}/edit`} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50 px-2 py-1 rounded"><Edit className="h-3 w-3" /> Edit</Link>
                          {s._count.results === 0 && (
                            <form action={deleteSubject}>
                              <input type="hidden" name="id" value={s.id} />
                              <button type="submit" className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 px-2 py-1 rounded"><Trash2 className="h-3 w-3" /> Delete</button>
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
