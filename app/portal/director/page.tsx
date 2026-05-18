import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import {
  Users, GraduationCap, UserCircle2, Wallet, CalendarCheck, ClipboardList,
  Sparkles, Mail, TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const admissionTone: Record<string, "neutral" | "success" | "warning" | "info"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  EXAM_SCHEDULED: "warning",
  ADMITTED: "success",
  REJECTED: "neutral",
};

export default async function DirectorDashboard() {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const { session: academicSession, term } = await getActiveContext();

  // Safe helper — first deploy may have empty tables, don't 500 the whole page.
  const safe = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
    try { return await p; } catch (err) { console.error(err); return fallback; }
  };

  const [
    studentCount, teacherCount, parentCount, classCount,
    admissionsTotal, pendingAdmissions, recentAdmissions,
    contactsTotal, recentContacts,
    activeTermFees,
  ] = await Promise.all([
    safe(prisma.student.count(), 0),
    safe(prisma.teacher.count(), 0),
    safe(prisma.parent.count(), 0),
    safe(prisma.class.count(), 0),
    safe(prisma.admission.count(), 0),
    safe(prisma.admission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }), 0),
    safe(
      prisma.admission.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, reference: true, applicantName: true, classApplyingFor: true, status: true, createdAt: true },
      }),
      [] as Awaited<ReturnType<typeof prisma.admission.findMany>>,
    ),
    safe(prisma.contactMessage.count(), 0),
    safe(
      prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, name: true, role: true, message: true, createdAt: true },
      }),
      [] as Awaited<ReturnType<typeof prisma.contactMessage.findMany>>,
    ),
    term ? safe(
      prisma.fee.aggregate({
        where: { termId: term.id },
        _sum: { amount: true, amountPaid: true },
      }),
      { _sum: { amount: null, amountPaid: null } } as { _sum: { amount: any; amountPaid: any } },
    ) : Promise.resolve({ _sum: { amount: null, amountPaid: null } }),
  ]);

  const totalDue = Number(activeTermFees._sum?.amount ?? 0);
  const totalPaid = Number(activeTermFees._sum?.amountPaid ?? 0);
  const outstanding = Math.max(0, totalDue - totalPaid);
  const collectionPct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  return (
    <PortalShell role="director">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Director Dashboard</h1>
          <p className="text-sm text-slate-500">
            {academicSession ? `Session ${academicSession.name}` : "No active session"} ·{" "}
            {term ? `${term.name.charAt(0) + term.name.slice(1).toLowerCase()} Term` : "No active term"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/admin"><Button variant="outline">School Admin View</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Students" value={studentCount} hint={`${classCount} classes`} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Teachers" value={teacherCount} hint="active faculty" icon={<GraduationCap className="h-5 w-5" />} accent="sky" />
        <StatCard label="Parents" value={parentCount} hint="linked accounts" icon={<UserCircle2 className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Term Fees" value={nairaFmt.format(totalPaid)} hint={`${nairaFmt.format(outstanding)} outstanding`} icon={<Wallet className="h-5 w-5" />} accent="gold" />
        <StatCard label="Collection" value={`${collectionPct}%`} hint="of billed fees" icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Admissions" value={pendingAdmissions} hint={`${admissionsTotal} all time`} icon={<ClipboardList className="h-5 w-5" />} accent="amber" />
      </div>

      <Card className="mb-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white border-0">
        <CardBody>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gold-400 text-brand-900 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">AI School Summary</p>
                <Badge tone="gold" className="bg-gold-400/30 text-gold-200">This term</Badge>
              </div>
              <p className="text-slate-200 leading-relaxed">
                {studentCount} student{studentCount === 1 ? "" : "s"} enrolled across {classCount} class{classCount === 1 ? "" : "es"}.{" "}
                <strong className="text-white">{pendingAdmissions}</strong> admission application{pendingAdmissions === 1 ? "" : "s"} awaiting review.
                {totalDue > 0 ? (
                  <> Fee collection is at <strong className="text-white">{collectionPct}%</strong> of {nairaFmt.format(totalDue)} billed.</>
                ) : (
                  <> No fee charges have been billed for the current term yet.</>
                )}
                {contactsTotal > 0 && <> {contactsTotal} website enquir{contactsTotal === 1 ? "y" : "ies"} on record.</>}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Admissions</CardTitle>
            <Link href="/portal/admin/applications" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentAdmissions.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No applications yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                      <th className="text-left px-4 py-2.5 font-medium">Applicant</th>
                      <th className="text-left px-4 py-2.5 font-medium">Class</th>
                      <th className="text-left px-4 py-2.5 font-medium">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAdmissions.map(a => (
                      <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">{a.reference}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{a.applicantName}</td>
                        <td className="px-4 py-2.5 text-slate-700">{a.classApplyingFor}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={admissionTone[a.status] ?? "neutral"}>{a.status.replace("_", " ")}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(a.createdAt)}</td>
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
            <CardTitle>Recent Enquiries</CardTitle>
            <Mail className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody className="space-y-4">
            {recentContacts.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No website enquiries yet.</p>
            ) : (
              recentContacts.map(c => (
                <div key={c.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-900 truncate">{c.name}</p>
                    <span className="text-[11px] text-slate-500 shrink-0">{dateFmt.format(c.createdAt)}</span>
                  </div>
                  {c.role && <p className="text-[12px] text-slate-500">{c.role}</p>}
                  <p className="mt-1 text-slate-600 line-clamp-2">{c.message}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
