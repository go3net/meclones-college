import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren, getActiveContext } from "@/lib/auth-helpers";
import { FileText, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { student?: string; term?: string };

const termOrder = ["FIRST", "SECOND", "THIRD"] as const;

export default async function ParentResultsPage({ searchParams }: { searchParams: SearchParams }) {
  const parent = await getCurrentParentWithChildren();
  const { session: activeSession, term: activeTerm } = await getActiveContext();

  // Pick a target child — query param wins, otherwise default to first child.
  const selectedStudentId = searchParams.student ?? parent.children[0]?.student.id;
  const selected = parent.children.find(c => c.student.id === selectedStudentId);

  if (parent.children.length === 0 || !selected) {
    return (
      <PortalShell role="parent">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brand-900">Results</h1>
        </div>
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No children linked to your account</p>
          <p className="text-sm text-slate-500 mt-1">Contact the school office to link your child's account.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const targetTermId = searchParams.term ?? activeTerm?.id;

  const results = targetTermId ? await prisma.result.findMany({
    where: {
      studentId: selected.student.id,
      termId: targetTermId,
      isPublished: true,
    },
    include: { subject: true, term: true, session: true },
    orderBy: { subject: { name: "asc" } },
  }) : [];

  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.total, 0) / results.length) : null;
  const position = results[0]?.position ?? null;

  const availableTerms = await prisma.term.findMany({
    where: results.length > 0 ? { results: { some: { studentId: selected.student.id, isPublished: true } } } : {},
    include: { session: true },
    orderBy: [{ session: { name: "desc" } }, { name: "asc" }],
  });

  return (
    <PortalShell role="parent">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Results</h1>
          <p className="text-sm text-slate-500">
            {selected.student.user.name}
            {selected.student.classRef && <> · {selected.student.classRef.name}{selected.student.classRef.arm}</>}
          </p>
        </div>

        {parent.children.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {parent.children.map(c => (
              <Link
                key={c.student.id}
                href={`/portal/parent/results?student=${c.student.id}${targetTermId ? `&term=${targetTermId}` : ""}`}
                className={
                  c.student.id === selected.student.id
                    ? "px-3 py-1.5 rounded-full text-xs font-medium bg-brand-700 text-white"
                    : "px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                }
              >
                {c.student.user.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No published results yet</p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTerm
                ? `Results for ${activeTerm.name.charAt(0) + activeTerm.name.slice(1).toLowerCase()} term will appear here once published.`
                : "Results will appear here once the school publishes them."}
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card><CardBody className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Subjects</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{results.length}</p>
            </CardBody></Card>
            <Card><CardBody className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Average</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{avg !== null ? `${avg}%` : "—"}</p>
            </CardBody></Card>
            <Card><CardBody className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Position</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{position ?? "—"}</p>
            </CardBody></Card>
            <Card><CardBody className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Term</p>
              <p className="mt-1 text-lg font-bold text-brand-900">
                {results[0].term.name.charAt(0) + results[0].term.name.slice(1).toLowerCase()}
              </p>
              <p className="text-xs text-slate-400">{results[0].session.name}</p>
            </CardBody></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subject breakdown</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                      <th className="text-right px-4 py-2.5 font-medium">CA1 /20</th>
                      <th className="text-right px-4 py-2.5 font-medium">CA2 /20</th>
                      <th className="text-right px-4 py-2.5 font-medium">Exam /60</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total /100</th>
                      <th className="text-center px-4 py-2.5 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{r.subject.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.ca1}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.ca2}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.exam}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.total}</td>
                        <td className="px-4 py-2.5 text-center">
                          {r.grade && <Badge tone={r.grade.startsWith("A") ? "success" : r.grade.startsWith("F") ? "danger" : "neutral"}>{r.grade}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {availableTerms.length > 1 && (
        <div className="mt-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Other terms</p>
          <div className="flex gap-2 flex-wrap">
            {availableTerms.map(t => (
              <Link
                key={t.id}
                href={`/portal/parent/results?student=${selected.student.id}&term=${t.id}`}
                className={t.id === targetTermId ? "px-3 py-1.5 rounded-full text-xs font-medium bg-brand-700 text-white" : "px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"}
              >
                {t.name.charAt(0) + t.name.slice(1).toLowerCase()} · {t.session.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
