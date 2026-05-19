import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { setResultsPublishState } from "./actions";
import { FileText, CheckCircle2, Send, EyeOff, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { published?: string; unpublished?: string; error?: string };

export default async function AdminResultsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term, session } = await getActiveContext();

  if (!term) {
    return (
      <PortalShell role="school_admin">
        <Card><CardBody className="py-12 text-center">
          <Clock className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term</p>
          <p className="text-sm text-slate-500 mt-1">Start a new session from Sessions to manage results.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  // Get all results for the active term, grouped by (class, subject).
  const allTermResults = await prisma.result.findMany({
    where: { termId: term.id },
    include: {
      student: { select: { classId: true, classRef: { select: { name: true, arm: true } } } },
      subject: { select: { name: true, code: true } },
      enteredBy: { include: { user: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Group: { classId-subjectId: { class, subject, totalRows, published, unpublished, latestUpdate } }
  type Batch = {
    classId: string;
    className: string;
    classArm: string;
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    rows: number;
    published: number;
    unpublished: number;
    latestUpdate: Date;
    teachers: Set<string>;
  };
  const batches = new Map<string, Batch>();

  for (const r of allTermResults) {
    if (!r.student.classId || !r.student.classRef) continue;
    const key = `${r.student.classId}|${r.subjectId}`;
    if (!batches.has(key)) {
      batches.set(key, {
        classId: r.student.classId,
        className: r.student.classRef.name,
        classArm: r.student.classRef.arm,
        subjectId: r.subjectId,
        subjectCode: r.subject.code,
        subjectName: r.subject.name,
        rows: 0,
        published: 0,
        unpublished: 0,
        latestUpdate: r.updatedAt,
        teachers: new Set(),
      });
    }
    const b = batches.get(key)!;
    b.rows++;
    if (r.isPublished) b.published++; else b.unpublished++;
    if (r.updatedAt > b.latestUpdate) b.latestUpdate = r.updatedAt;
    if (r.enteredBy) b.teachers.add(r.enteredBy.user.name);
  }

  const batchList = Array.from(batches.values()).sort((a, b) => b.latestUpdate.getTime() - a.latestUpdate.getTime());
  const pendingBatches = batchList.filter(b => b.unpublished > 0);
  const fullyPublished = batchList.filter(b => b.unpublished === 0 && b.published > 0);

  const totalRows = allTermResults.length;
  const totalPublished = allTermResults.filter(r => r.isPublished).length;
  const totalUnpublished = totalRows - totalPublished;

  const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Results Approval</h1>
        <p className="text-sm text-slate-500">
          {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session?.name ?? ""} ·
          Review what teachers have entered and publish to students/parents.
        </p>
      </div>

      {searchParams.published && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Batch published. Students & parents can now see these scores.</div>
      )}
      {searchParams.unpublished && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2"><EyeOff className="h-4 w-4" /> Batch unpublished. Hidden from students & parents.</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total rows" value={totalRows} hint="this term" icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Pending approval" value={totalUnpublished} hint={`${pendingBatches.length} batches`} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Published" value={totalPublished} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Fully done" value={fullyPublished.length} hint="class × subject" accent="gold" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Pending approval ({pendingBatches.length})</CardTitle>
          <Badge tone="warning">{totalUnpublished} unpublished rows</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {pendingBatches.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">All caught up — no pending batches.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Class</th>
                  <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                  <th className="text-left px-4 py-2.5 font-medium">Entered by</th>
                  <th className="text-right px-4 py-2.5 font-medium">Draft</th>
                  <th className="text-right px-4 py-2.5 font-medium">Published</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last updated</th>
                  <th className="text-right px-4 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingBatches.map(b => (
                  <tr key={`${b.classId}-${b.subjectId}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5"><Badge tone="neutral">{b.className}{b.classArm}</Badge></td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{b.subjectCode} <span className="text-xs text-slate-500 font-normal">{b.subjectName}</span></td>
                    <td className="px-4 py-2.5 text-slate-600 text-[12px]">{Array.from(b.teachers).join(", ") || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{b.unpublished}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{b.published}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(b.latestUpdate)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={setResultsPublishState}>
                        <input type="hidden" name="classId" value={b.classId} />
                        <input type="hidden" name="subjectId" value={b.subjectId} />
                        <input type="hidden" name="termId" value={term.id} />
                        <input type="hidden" name="publish" value="true" />
                        <Button type="submit" variant="gold" className="text-xs"><Send className="h-3 w-3" /> Publish</Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published batches ({fullyPublished.length})</CardTitle>
          <Badge tone="success">{totalPublished} rows visible to students/parents</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {fullyPublished.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Nothing published yet for this term.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Class</th>
                  <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                  <th className="text-left px-4 py-2.5 font-medium">Entered by</th>
                  <th className="text-right px-4 py-2.5 font-medium">Rows</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last updated</th>
                  <th className="text-right px-4 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {fullyPublished.map(b => (
                  <tr key={`${b.classId}-${b.subjectId}`} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5"><Badge tone="neutral">{b.className}{b.classArm}</Badge></td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{b.subjectCode}</td>
                    <td className="px-4 py-2.5 text-slate-600 text-[12px]">{Array.from(b.teachers).join(", ") || "—"}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{b.published}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(b.latestUpdate)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={setResultsPublishState}>
                        <input type="hidden" name="classId" value={b.classId} />
                        <input type="hidden" name="subjectId" value={b.subjectId} />
                        <input type="hidden" name="termId" value={term.id} />
                        <input type="hidden" name="publish" value="false" />
                        <Button type="submit" variant="outline" className="text-xs"><EyeOff className="h-3 w-3" /> Unpublish</Button>
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
