import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { Wallet, CreditCard, AlertCircle, Users, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const feeTone: Record<string, "success" | "warning" | "danger"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "danger",
};

export default async function AccountantDashboard() {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term, session } = await getActiveContext();

  if (!term) {
    return (
      <PortalShell role="accountant">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  // Aggregate all fees for the active term.
  const fees = await prisma.fee.findMany({
    where: { termId: term.id },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
          parentLinks: { include: { parent: { include: { user: { select: { name: true, phone: true } } } } } },
        },
      },
    },
  });

  const totals = fees.reduce(
    (acc, f) => ({
      billed: acc.billed + Number(f.amount),
      paid: acc.paid + Number(f.amountPaid),
      balance: acc.balance + Number(f.balance),
    }),
    { billed: 0, paid: 0, balance: 0 },
  );

  // Group by student to derive debtor list.
  const byStudent = fees.reduce((acc, f) => {
    const key = f.studentId;
    if (!acc.has(key)) {
      acc.set(key, {
        student: f.student,
        billed: 0,
        paid: 0,
        balance: 0,
        statuses: new Set<string>(),
      });
    }
    const x = acc.get(key)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
    x.balance += Number(f.balance);
    x.statuses.add(f.status);
    return acc;
  }, new Map<string, { student: (typeof fees)[number]["student"]; billed: number; paid: number; balance: number; statuses: Set<string> }>());

  const studentRows = Array.from(byStudent.values())
    .sort((a, b) => b.balance - a.balance);
  const debtors = studentRows.filter(r => r.balance > 0);
  const fullPayers = studentRows.filter(r => r.balance === 0).length;

  const collectionPct = totals.billed > 0 ? Math.round((totals.paid / totals.billed) * 100) : 0;

  return (
    <PortalShell role="accountant">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Accountant Dashboard</h1>
        <p className="text-sm text-slate-500">
          {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session?.name ?? ""} · school-wide fee status
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Billed" value={nairaFmt.format(totals.billed)} hint={`${studentRows.length} students`} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Collected" value={nairaFmt.format(totals.paid)} hint={`${collectionPct}% of billed`} icon={<CreditCard className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Outstanding" value={nairaFmt.format(totals.balance)} hint={`${debtors.length} debtors`} icon={<AlertCircle className="h-5 w-5" />} accent={totals.balance > 0 ? "rose" : "emerald"} />
        <StatCard label="Fully Paid" value={fullPayers} hint="students cleared" icon={<Users className="h-5 w-5" />} accent="sky" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Debtors ({debtors.length})</CardTitle>
          <Link href="/portal/accountant/debtors" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
        </CardHeader>
        <CardBody className="p-0">
          {debtors.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No outstanding balances 🎉</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Parent</th>
                    <th className="text-right px-4 py-2.5 font-medium">Billed</th>
                    <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.slice(0, 20).map(r => {
                    const status = r.balance === 0 ? "PAID" : r.paid > 0 ? "PARTIAL" : "UNPAID";
                    const primaryParent = r.student.parentLinks[0]?.parent.user;
                    return (
                      <tr key={r.student.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-900">{r.student.user.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{r.student.admissionNumber}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.student.classRef ? <Badge tone="neutral">{r.student.classRef.name}{r.student.classRef.arm}</Badge> : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[12px]">
                          {primaryParent ? (
                            <div>
                              <div className="text-slate-800">{primaryParent.name}</div>
                              {primaryParent.phone && <div className="text-slate-500">{primaryParent.phone}</div>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{nairaFmt.format(r.billed)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">{nairaFmt.format(r.paid)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-rose-700">{nairaFmt.format(r.balance)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={feeTone[status] ?? "neutral"}>{status.toLowerCase()}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {debtors.length > 20 && (
                <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
                  Showing 20 of {debtors.length} debtors.
                  <Link href="/portal/accountant/debtors" className="font-medium text-brand-700 hover:underline inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
