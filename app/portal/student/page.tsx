import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent, getActiveContext } from "@/lib/auth-helpers";
import { FileText, CalendarCheck, Wallet, MessageCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function StudentDashboard() {
  const student = await getCurrentStudent();
  const { term } = await getActiveContext();

  const [fees, attendance, results, announcements] = await Promise.all([
    term ? prisma.fee.findMany({ where: { studentId: student.id, termId: term.id } }) : Promise.resolve([]),
    term ? prisma.attendance.findMany({ where: { studentId: student.id, termId: term.id }, select: { status: true } }) : Promise.resolve([]),
    term ? prisma.result.findMany({
      where: { studentId: student.id, termId: term.id, isPublished: true },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
      take: 12,
    }) : Promise.resolve([]),
    prisma.announcement.findMany({
      where: {
        OR: [
          { audience: "ALL" },
          { audience: "STUDENTS" },
          ...(student.classId ? [{ audience: "CLASS" as const, classId: student.classId }] : []),
        ],
        publishedAt: { not: null },
      },
      orderBy: { publishedAt: "desc" },
      take: 4,
    }),
  ]);

  const totalBilled = fees.reduce((s, f) => s + Number(f.amount), 0);
  const totalPaid = fees.reduce((s, f) => s + Number(f.amountPaid), 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);

  const present = attendance.filter(a => a.status === "PRESENT").length;
  const total = attendance.length;
  const attRate = total > 0 ? Math.round((present / total) * 100) : 0;

  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.total, 0) / results.length) : null;
  const position = results[0]?.position ?? null;

  return (
    <PortalShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Hello, {student.user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Not assigned to a class"} · <span className="font-mono">{student.admissionNumber}</span>
          {term && <> · {term.name.charAt(0) + term.name.slice(1).toLowerCase()} term</>}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Average" value={avg !== null ? `${avg}%` : "—"} hint={`${results.length} subjects`} icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Position" value={position ?? "—"} hint="this term" icon={<FileText className="h-5 w-5" />} accent="gold" />
        <StatCard label="Attendance" value={total > 0 ? `${attRate}%` : "—"} hint={`${present}/${total} days`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Fee balance" value={nairaFmt.format(outstanding)} hint={outstanding === 0 ? "all paid" : "outstanding"} icon={<Wallet className="h-5 w-5" />} accent={outstanding === 0 ? "emerald" : "amber"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest results</CardTitle>
            <Link href="/portal/student/results" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
          </CardHeader>
          <CardBody className="p-0">
            {results.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                {term ? "No published results for this term yet." : "No active term."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                      <th className="text-right px-4 py-2.5 font-medium">Total /100</th>
                      <th className="text-center px-4 py-2.5 font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{r.subject.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.total}</td>
                        <td className="px-4 py-2.5 text-center">
                          {r.grade && <Badge tone={r.grade.startsWith("A") ? "success" : r.grade.startsWith("F") ? "danger" : "neutral"}>{r.grade}</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcements</CardTitle>
            <MessageCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No announcements yet.</p>
            ) : (
              announcements.map(a => (
                <div key={a.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-brand-900 text-sm">{a.title}</p>
                    <span className="text-[11px] text-slate-500 shrink-0">{a.publishedAt && dateFmt.format(a.publishedAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{a.body}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {outstanding > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardBody className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-amber-900">You have outstanding fees</p>
              <p className="text-sm text-amber-800">{nairaFmt.format(outstanding)} pending for this term.</p>
            </div>
            <Link href="/portal/parent/fees"><Button className="bg-brand-900 hover:bg-brand-950">Pay Now <ArrowRight className="h-4 w-4" /></Button></Link>
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
