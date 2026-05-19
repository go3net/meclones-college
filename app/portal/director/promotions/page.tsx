import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { promoteAllStudents, ungraduateStudent } from "./actions";
import { nextLevelName } from "@/lib/promotion";
import {
  TrendingUp, AlertCircle, CheckCircle2, GraduationCap, Users, ArrowRight, RotateCcw,
} from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { promoted?: string; graduated?: string; skipped?: string; error?: string };

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function PromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    include: { _count: { select: { students: { where: { graduatedAt: null } } } } },
  });

  const classByKey = new Map(classes.map(c => [`${c.name.trim().toUpperCase().replace(/\s+/g, " ")}|${c.arm}`, c]));

  // Build the preview: from each non-empty class, where would students go?
  const transitions = classes
    .filter(c => c._count.students > 0)
    .map(c => {
      const next = nextLevelName(c.name);
      const target = next ? classByKey.get(`${next}|${c.arm}`) ?? null : null;
      return {
        fromClass: c,
        next,
        target,
        // Highlight problems: SS 3 = graduates (OK); next class missing = warning.
        kind: next === null ? "graduate" : target ? "promote" : "warning",
        count: c._count.students,
      };
    });

  const totalActive = classes.reduce((s, c) => s + c._count.students, 0);
  const totalPromotable = transitions.filter(t => t.kind === "promote").reduce((s, t) => s + t.count, 0);
  const totalGraduating = transitions.filter(t => t.kind === "graduate").reduce((s, t) => s + t.count, 0);
  const totalAtRisk = transitions.filter(t => t.kind === "warning").reduce((s, t) => s + t.count, 0);

  const graduated = await prisma.student.findMany({
    where: { graduatedAt: { not: null } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { graduatedAt: "desc" },
    take: 50,
  });

  return (
    <PortalShell role="director">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Promotions & Graduation</h1>
        <p className="text-sm text-slate-500">
          Bulk-promote every student to their next class at session rotation. SS 3 students are marked as graduated.
        </p>
      </div>

      {searchParams.promoted && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Promoted <strong>{searchParams.promoted}</strong> · Graduated <strong>{searchParams.graduated}</strong>
          {Number(searchParams.skipped) > 0 && <> · Skipped <strong>{searchParams.skipped}</strong> (missing target class)</>}
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active students" value={totalActive} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Will be promoted" value={totalPromotable} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Will graduate" value={totalGraduating} icon={<GraduationCap className="h-5 w-5" />} accent="gold" />
        <StatCard label="Missing target" value={totalAtRisk} hint="will be left in place" icon={<AlertCircle className="h-5 w-5" />} accent={totalAtRisk > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><TrendingUp className="h-4 w-4 inline mr-1" /> Preview the promotion</CardTitle>
            <Badge tone="neutral">{transitions.length} non-empty classes</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {transitions.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No active students to promote.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">From class</th>
                    <th className="text-center px-4 py-2 font-medium" />
                    <th className="text-left px-4 py-2 font-medium">Target</th>
                    <th className="text-right px-4 py-2 font-medium">Students</th>
                    <th className="text-left px-4 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {transitions.map(t => (
                    <tr key={t.fromClass.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-semibold text-brand-900">{t.fromClass.name}{t.fromClass.arm}</td>
                      <td className="px-4 py-2 text-center text-slate-400"><ArrowRight className="h-4 w-4 inline" /></td>
                      <td className="px-4 py-2">
                        {t.kind === "graduate" && <Badge tone="gold">Graduate</Badge>}
                        {t.kind === "promote" && t.target && (
                          <Badge tone="success">{t.target.name}{t.target.arm}</Badge>
                        )}
                        {t.kind === "warning" && (
                          <span className="text-rose-700 text-xs">Missing {t.next} {t.fromClass.arm}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{t.count}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {t.kind === "graduate" && "Marked as alumni"}
                        {t.kind === "promote" && "Moved into new class"}
                        {t.kind === "warning" && "Left in current class until target exists"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Run promotion</CardTitle></CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              This affects <strong className="text-brand-900">{totalActive} student{totalActive === 1 ? "" : "s"}</strong>. It can be partially undone by editing individual students afterwards. The full operation is captured in the audit log.
            </p>
            {totalAtRisk > 0 && (
              <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                <strong>{totalAtRisk}</strong> student{totalAtRisk === 1 ? "" : "s"} will be skipped because the target class doesn't exist yet. Create the missing classes first under <Link href="/portal/admin/classes" className="underline">Classes</Link>.
              </div>
            )}
            <form action={promoteAllStudents} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Type <code className="bg-slate-100 px-1 rounded">PROMOTE</code> to confirm</label>
                <input
                  type="text"
                  name="confirm"
                  required
                  pattern="PROMOTE"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <Button type="submit" variant="gold" className="w-full">
                <TrendingUp className="h-4 w-4" /> Run promotion
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Alumni listing */}
      <Card>
        <CardHeader>
          <CardTitle><GraduationCap className="h-4 w-4 inline mr-1" /> Recent graduates</CardTitle>
          <Badge tone="neutral">{graduated.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {graduated.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No graduates yet.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Admission #</th>
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Graduated</th>
                  <th className="text-right px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {graduated.map(s => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-mono text-[12px] text-brand-700">{s.admissionNumber}</td>
                    <td className="px-4 py-2 font-medium text-slate-900">{s.user.name}</td>
                    <td className="px-4 py-2 text-slate-600 text-[12px]">{s.user.email}</td>
                    <td className="px-4 py-2 text-slate-500 text-[12px]">{s.graduatedAt ? dateFmt.format(s.graduatedAt) : "—"}</td>
                    <td className="px-4 py-2 text-right">
                      <form action={ungraduateStudent} className="inline-flex items-center gap-1">
                        <input type="hidden" name="studentId" value={s.id} />
                        <select name="targetClassId" required className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5">
                          <option value="">Restore to…</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
                        </select>
                        <button type="submit" className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded">
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
