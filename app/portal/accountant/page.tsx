import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import {
  Wallet, CreditCard, AlertCircle, Users, ArrowRight, Receipt, Send,
  ClipboardList, TrendingUp, Phone, Calendar, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", notation: "compact", maximumFractionDigits: 1 });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

const methodLabel: Record<string, string> = {
  PAYSTACK: "Paystack",
  CASH: "Cash",
  TRANSFER: "Transfer",
  CHEQUE: "Cheque",
  POS: "POS",
  OTHER: "Other",
};
const methodTone: Record<string, "info" | "success" | "warning" | "neutral"> = {
  PAYSTACK: "info",
  CASH: "success",
  TRANSFER: "info",
  CHEQUE: "warning",
  POS: "info",
  OTHER: "neutral",
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
          <p className="text-sm text-slate-500 mt-1">Ask the director to set the active session and term.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  // ─── Parallel data fetch ─────────────────────────────────────────────
  const [fees, recentPayments, totalThisMonthAgg, paidTodayAgg, monthCount] = await Promise.all([
    prisma.fee.findMany({
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
    }),
    prisma.payment.findMany({
      where: { status: "SUCCESS" },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: {
        fee: {
          include: {
            student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
          },
        },
      },
    }),
    (async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      return prisma.payment.aggregate({
        where: { status: "SUCCESS", paidAt: { gte: start } },
        _sum: { amount: true },
      });
    })(),
    (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      return prisma.payment.aggregate({
        where: { status: "SUCCESS", paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
      });
    })(),
    (async () => {
      const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
      return prisma.payment.count({ where: { status: "SUCCESS", paidAt: { gte: start } } });
    })(),
  ]);

  // ─── Roll-ups ────────────────────────────────────────────────────────
  const totals = fees.reduce(
    (acc, f) => ({
      billed: acc.billed + Number(f.amount),
      paid: acc.paid + Number(f.amountPaid),
      balance: acc.balance + Number(f.balance),
    }),
    { billed: 0, paid: 0, balance: 0 },
  );

  // Per-student rollup
  const byStudent = fees.reduce((acc, f) => {
    const key = f.studentId;
    if (!acc.has(key)) {
      acc.set(key, { student: f.student, billed: 0, paid: 0, balance: 0 });
    }
    const x = acc.get(key)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
    x.balance += Number(f.balance);
    return acc;
  }, new Map<string, { student: (typeof fees)[number]["student"]; billed: number; paid: number; balance: number }>());

  const studentRows = Array.from(byStudent.values());
  const debtors = studentRows.filter(r => r.balance > 0).sort((a, b) => b.balance - a.balance);
  const fullPayers = studentRows.filter(r => r.billed > 0 && r.balance === 0).length;

  // Per-class rollup (for the bar breakdown)
  const byClass = new Map<string, { name: string; billed: number; paid: number; balance: number }>();
  for (const f of fees) {
    const key = f.student.classRef ? `${f.student.classRef.name}${f.student.classRef.arm}` : "Unassigned";
    if (!byClass.has(key)) byClass.set(key, { name: key, billed: 0, paid: 0, balance: 0 });
    const x = byClass.get(key)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
    x.balance += Number(f.balance);
  }
  const classRows = Array.from(byClass.values())
    .filter(r => r.billed > 0)
    .sort((a, b) => b.billed - a.billed);

  // Per-fee-type rollup
  const byFeeType = new Map<string, { type: string; billed: number; paid: number }>();
  for (const f of fees) {
    if (!byFeeType.has(f.feeType)) byFeeType.set(f.feeType, { type: f.feeType, billed: 0, paid: 0 });
    const x = byFeeType.get(f.feeType)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
  }
  const feeTypeRows = Array.from(byFeeType.values())
    .sort((a, b) => b.billed - a.billed);

  const collectionPct = totals.billed > 0 ? Math.round((totals.paid / totals.billed) * 100) : 0;
  const thisMonth = Number(totalThisMonthAgg._sum.amount ?? 0);
  const today = Number(paidTodayAgg._sum.amount ?? 0);

  return (
    <PortalShell role="accountant">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Finance
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Accountant dashboard</h1>
          <p className="text-sm text-slate-500">
            {term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session?.name ?? ""} · school-wide fee status
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/accountant/record-payment">
            <Button variant="gold"><Receipt className="h-4 w-4" /> Record payment</Button>
          </Link>
          <Link href="/portal/accountant/reminders">
            <Button variant="outline"><Send className="h-4 w-4" /> Send reminders</Button>
          </Link>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Billed (term)" value={compactFmt.format(totals.billed)} hint={`${studentRows.length} students`} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Collected (term)" value={compactFmt.format(totals.paid)} hint={`${collectionPct}% of billed`} icon={<CreditCard className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Outstanding" value={compactFmt.format(totals.balance)} hint={`${debtors.length} debtors`} icon={<AlertCircle className="h-5 w-5" />} accent={totals.balance > 0 ? "rose" : "emerald"} />
        <StatCard label="Fully paid students" value={fullPayers} hint="balance ₦0" icon={<CheckCircle2 className="h-5 w-5" />} accent="sky" />
      </div>

      {/* Collection progress hero */}
      <Card className="mb-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white border-0 overflow-hidden">
        <CardBody>
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs uppercase tracking-wide text-gold-300">Term collection progress</p>
              <p className="font-display text-3xl font-bold mt-1">{collectionPct}%</p>
              <p className="text-sm text-slate-200 mt-1">
                <strong>{nairaFmt.format(totals.paid)}</strong> received of <strong>{nairaFmt.format(totals.billed)}</strong> billed.
              </p>
              <div className="mt-3 h-2.5 w-full bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-400 transition-all"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 min-w-[220px]">
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-300">This month</p>
                <p className="text-2xl font-bold text-gold-300 mt-1">{compactFmt.format(thisMonth)}</p>
                <p className="text-[11px] text-slate-300">{monthCount} payment{monthCount === 1 ? "" : "s"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gold-300">Today</p>
                <p className="text-2xl font-bold text-gold-300 mt-1">{compactFmt.format(today)}</p>
                <p className="text-[11px] text-slate-300">{today > 0 ? "received so far" : "nothing yet"}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Breakdowns */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Per-class breakdown */}
        <Card>
          <CardHeader>
            <CardTitle><ClipboardList className="h-4 w-4 inline mr-1" /> By class</CardTitle>
            <Badge tone="neutral">{classRows.length}</Badge>
          </CardHeader>
          <CardBody>
            {classRows.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No fees billed yet this term.</p>
            ) : (
              <div className="space-y-3">
                {classRows.map(c => {
                  const pct = c.billed > 0 ? Math.round((c.paid / c.billed) * 100) : 0;
                  const colour = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-brand-900">{c.name}</span>
                        <span className="text-xs text-slate-500">
                          {nairaFmt.format(c.paid)} / {nairaFmt.format(c.billed)} · <strong className={pct >= 80 ? "text-emerald-700" : pct >= 50 ? "text-amber-700" : "text-rose-700"}>{pct}%</strong>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colour} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Per fee-type */}
        <Card>
          <CardHeader>
            <CardTitle><TrendingUp className="h-4 w-4 inline mr-1" /> By fee type</CardTitle>
            <Badge tone="neutral">{feeTypeRows.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {feeTypeRows.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No fees billed yet.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Item</th>
                    <th className="text-right px-4 py-2 font-medium">Billed</th>
                    <th className="text-right px-4 py-2 font-medium">Paid</th>
                    <th className="text-right px-4 py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {feeTypeRows.map(r => {
                    const pct = r.billed > 0 ? Math.round((r.paid / r.billed) * 100) : 0;
                    return (
                      <tr key={r.type} className="border-t border-slate-100">
                        <td className="px-4 py-2 font-medium text-slate-900">{r.type}</td>
                        <td className="px-4 py-2 text-right text-slate-700">{nairaFmt.format(r.billed)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700">{nairaFmt.format(r.paid)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent payments + Top defaulters */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent payments */}
        <Card>
          <CardHeader>
            <CardTitle><Receipt className="h-4 w-4 inline mr-1" /> Recent payments</CardTitle>
            <Link href="/portal/accountant/payments" className="text-xs font-medium text-brand-700 hover:underline">View ledger →</Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentPayments.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No payments recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map(p => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-brand-900 truncate">
                        {p.fee.student.user.name}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Badge tone={methodTone[p.method]}>{methodLabel[p.method]}</Badge>
                        <span>{p.fee.feeType}</span>
                        {p.paidAt && <><span>·</span><Calendar className="h-3 w-3" /><span>{dateTimeFmt.format(p.paidAt)}</span></>}
                      </p>
                    </div>
                    <Link href={`/portal/parent/fees/receipt/${p.id}`} className="text-sm font-bold text-emerald-700 hover:underline shrink-0">
                      {nairaFmt.format(Number(p.amount))}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Top defaulters */}
        <Card>
          <CardHeader>
            <CardTitle><AlertCircle className="h-4 w-4 inline mr-1" /> Top defaulters</CardTitle>
            <Link href="/portal/accountant/debtors" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
          </CardHeader>
          <CardBody className="p-0">
            {debtors.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-300 mb-2" />
                <p className="text-sm text-slate-700 font-medium">All clear</p>
                <p className="text-xs text-slate-500 mt-1">Every student is paid up for this term.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {debtors.slice(0, 5).map(r => {
                  const p = r.student.parentLinks[0]?.parent.user;
                  return (
                    <div key={r.student.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-brand-900 truncate">{r.student.user.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {r.student.classRef ? `${r.student.classRef.name}${r.student.classRef.arm} · ` : ""}{r.student.admissionNumber}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-rose-700 shrink-0">{nairaFmt.format(r.balance)}</p>
                      </div>
                      {p && (
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{p.name}</span>
                          {p.phone && (
                            <>
                              <a href={`tel:${p.phone}`} className="text-brand-700 hover:underline inline-flex items-center gap-0.5"><Phone className="h-3 w-3" /> {p.phone}</a>
                              <a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="text-emerald-700 hover:underline">WhatsApp</a>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {debtors.length > 5 && (
                  <div className="px-4 py-2.5 text-xs text-slate-500 flex items-center justify-between">
                    {debtors.length - 5} more debtor{debtors.length - 5 === 1 ? "" : "s"}.
                    <Link href="/portal/accountant/debtors" className="font-medium text-brand-700 hover:underline inline-flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
