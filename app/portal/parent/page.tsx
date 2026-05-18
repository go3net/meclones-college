import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren, getActiveContext } from "@/lib/auth-helpers";
import { Users, Wallet, CalendarCheck, MessageCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function ParentDashboard() {
  const parent = await getCurrentParentWithChildren();
  const { term } = await getActiveContext();

  const studentIds = parent.children.map(c => c.student.id);

  // Fee summary per child for the active term (if any). Falls back to all-time.
  const feeWhere = term ? { studentId: { in: studentIds }, termId: term.id } : { studentId: { in: studentIds } };
  const fees = studentIds.length === 0 ? [] : await prisma.fee.findMany({
    where: feeWhere,
    select: { studentId: true, amount: true, amountPaid: true, balance: true, status: true, dueDate: true, feeType: true },
  });

  const feeByStudent = fees.reduce((acc, f) => {
    const cur = acc.get(f.studentId) ?? { billed: 0, paid: 0 };
    cur.billed += Number(f.amount);
    cur.paid += Number(f.amountPaid);
    acc.set(f.studentId, cur);
    return acc;
  }, new Map<string, { billed: number; paid: number }>());

  // Attendance rate per child this term.
  const attendanceWhere = term ? { studentId: { in: studentIds }, termId: term.id } : { studentId: { in: studentIds } };
  const attendance = studentIds.length === 0 ? [] : await prisma.attendance.findMany({
    where: attendanceWhere,
    select: { studentId: true, status: true },
  });
  const attByStudent = attendance.reduce((acc, a) => {
    const cur = acc.get(a.studentId) ?? { present: 0, absent: 0, late: 0, total: 0 };
    cur.total++;
    if (a.status === "PRESENT") cur.present++;
    else if (a.status === "ABSENT") cur.absent++;
    else if (a.status === "LATE") cur.late++;
    acc.set(a.studentId, cur);
    return acc;
  }, new Map<string, { present: number; absent: number; late: number; total: number }>());

  // Latest published results per child for the active term.
  const latestResults = term && studentIds.length > 0 ? await prisma.result.findMany({
    where: { studentId: { in: studentIds }, termId: term.id, isPublished: true },
    select: { id: true, studentId: true, total: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  }) : [];

  const resultsByStudent = latestResults.reduce((acc, r) => {
    const list = acc.get(r.studentId) ?? [];
    list.push(r);
    acc.set(r.studentId, list);
    return acc;
  }, new Map<string, typeof latestResults>());

  // Recent announcements (school-wide).
  const announcements = await prisma.announcement.findMany({
    where: { OR: [{ audience: "ALL" }, { audience: "PARENTS" }], publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });

  // Totals across all children for the top stat cards.
  const totals = Array.from(feeByStudent.values()).reduce(
    (acc, x) => ({ billed: acc.billed + x.billed, paid: acc.paid + x.paid }),
    { billed: 0, paid: 0 },
  );
  const outstanding = Math.max(0, totals.billed - totals.paid);
  const totalAtt = Array.from(attByStudent.values()).reduce(
    (acc, x) => ({ present: acc.present + x.present, total: acc.total + x.total }),
    { present: 0, total: 0 },
  );
  const attRate = totalAtt.total > 0 ? Math.round((totalAtt.present / totalAtt.total) * 100) : 0;

  return (
    <PortalShell role="parent">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Welcome back, {parent.user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">Here's a summary across your {parent.children.length} child{parent.children.length === 1 ? "" : "ren"} at Meclones College Lekki.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Children" value={parent.children.length} hint="linked to your account" icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard
          label="Fee paid"
          value={nairaFmt.format(totals.paid)}
          hint={`${nairaFmt.format(outstanding)} outstanding`}
          icon={<Wallet className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label="Attendance"
          value={totalAtt.total > 0 ? `${attRate}%` : "—"}
          hint={term ? `${term.name.charAt(0) + term.name.slice(1).toLowerCase()} term` : "no active term"}
          icon={<CalendarCheck className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Announcements"
          value={announcements.length}
          hint="recent"
          icon={<MessageCircle className="h-5 w-5" />}
          accent="sky"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {parent.children.length === 0 ? (
          <Card className="lg:col-span-3"><CardBody className="text-center py-12">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No children linked yet</p>
            <p className="text-sm text-slate-500 mt-1">Contact the school office to link your child's account to yours.</p>
          </CardBody></Card>
        ) : (
          parent.children.map(link => {
            const s = link.student;
            const f = feeByStudent.get(s.id) ?? { billed: 0, paid: 0 };
            const a = attByStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, total: 0 };
            const rate = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0;
            const bal = Math.max(0, f.billed - f.paid);
            const results = resultsByStudent.get(s.id) ?? [];
            const avg = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.total, 0) / results.length) : null;

            return (
              <Card key={s.id} className="hover:shadow-lift transition-shadow">
                <CardBody>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-brand-900">{s.user.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.admissionNumber}</p>
                    </div>
                    {s.classRef && (
                      <Badge tone="neutral">{s.classRef.name}{s.classRef.arm}</Badge>
                    )}
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-500">Attendance</dt><dd className="font-medium text-slate-900">{a.total > 0 ? `${rate}%` : "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Fee balance</dt><dd className="font-medium text-slate-900">{nairaFmt.format(bal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-500">Avg score</dt><dd className="font-medium text-slate-900">{avg !== null ? `${avg}%` : "—"}</dd></div>
                  </dl>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/portal/parent/results?student=${s.id}`} className="flex-1"><Button variant="outline" className="w-full text-xs">Results <ArrowRight className="h-3 w-3" /></Button></Link>
                    <Link href="/portal/parent/fees" className="flex-1"><Button variant="outline" className="w-full text-xs">Pay <ArrowRight className="h-3 w-3" /></Button></Link>
                  </div>
                </CardBody>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Announcements</CardTitle>
          <Link href="/portal/parent/announcements" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
        </CardHeader>
        <CardBody className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No announcements yet.</p>
          ) : (
            announcements.map(a => (
              <div key={a.id} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-brand-900">{a.title}</p>
                  <span className="text-[11px] text-slate-500">{a.publishedAt && dateFmt.format(a.publishedAt)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{a.body}</p>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
