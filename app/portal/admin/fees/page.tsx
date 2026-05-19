import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button, Input, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { bulkChargeFee, recordPayment } from "./actions";
import { Wallet, Plus, CheckCircle2, AlertCircle, TrendingUp, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const feeTone: Record<string, "success" | "warning" | "danger"> = {
  PAID: "success", PARTIAL: "warning", UNPAID: "danger",
};

type SearchParams = { classId?: string; status?: string; added?: string; paid?: string; error?: string };

export default async function AdminFeesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "ACCOUNTANT", "SUPER_ADMIN"]);
  const { term, session } = await getActiveContext();

  if (!term) {
    return <PortalShell role="school_admin">
      <Card><CardBody className="py-12 text-center">No active term — start a session first.</CardBody></Card>
    </PortalShell>;
  }

  const classes = await prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] });
  const classFilter = searchParams.classId && classes.some(c => c.id === searchParams.classId) ? searchParams.classId : undefined;
  const statusFilter = (searchParams.status ?? "ALL").toUpperCase();

  const where: Record<string, unknown> = { termId: term.id };
  if (classFilter) where.student = { classId: classFilter };
  if (["PAID", "PARTIAL", "UNPAID"].includes(statusFilter)) where.status = statusFilter;

  const [fees, allFees] = await Promise.all([
    prisma.fee.findMany({
      where,
      include: {
        student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 300,
    }),
    prisma.fee.findMany({ where: { termId: term.id }, select: { amount: true, amountPaid: true, balance: true, status: true } }),
  ]);

  const totals = allFees.reduce((acc, f) => {
    acc.billed += Number(f.amount);
    acc.paid += Number(f.amountPaid);
    acc.balance += Number(f.balance);
    acc.rows++;
    return acc;
  }, { billed: 0, paid: 0, balance: 0, rows: 0 });
  const pct = totals.billed > 0 ? Math.round((totals.paid / totals.billed) * 100) : 0;

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Fees</h1>
          <p className="text-sm text-slate-500">{term.name.charAt(0)}{term.name.slice(1).toLowerCase()} Term · Session {session?.name ?? ""}</p>
        </div>
      </div>

      {searchParams.added && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {decodeURIComponent(searchParams.added)}</div>}
      {searchParams.paid && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><Receipt className="h-4 w-4" /> Payment recorded.</div>}
      {searchParams.error && <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Billed" value={nairaFmt.format(totals.billed)} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Collected" value={nairaFmt.format(totals.paid)} hint={`${pct}% rate`} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Outstanding" value={nairaFmt.format(totals.balance)} accent="rose" />
        <StatCard label="Fee rows" value={totals.rows} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardBody>
            <form action="" method="GET" className="flex flex-wrap items-end gap-2 text-sm">
              <div>
                <Label>Class</Label>
                <Select name="classId" defaultValue={classFilter ?? ""}>
                  <option value="">All classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={statusFilter}>
                  <option value="ALL">All</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="PAID">Paid</option>
                </Select>
              </div>
              <Button type="submit" variant="outline">Apply</Button>
              {(classFilter || statusFilter !== "ALL") && <Link href="/portal/admin/fees" className="text-xs text-slate-600 hover:underline px-2 py-2">Clear</Link>}
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Bulk-charge a fee</CardTitle></CardHeader>
          <CardBody>
            <form action={bulkChargeFee} className="space-y-3 text-sm">
              <div>
                <Label>Class *</Label>
                <Select name="classId" required defaultValue="">
                  <option value="" disabled>Select…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
                </Select>
              </div>
              <div><Label>Fee type *</Label><Input name="feeType" required placeholder="e.g. Tuition Fee" /></div>
              <div><Label>Amount ₦ *</Label><Input name="amount" type="number" min={0} step="500" required /></div>
              <div><Label>Due date</Label><Input name="dueDate" type="date" /></div>
              <Button type="submit" variant="gold" className="w-full"><Plus className="h-4 w-4" /> Charge class</Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Fee records ({fees.length} shown)</CardTitle></CardHeader>
        <CardBody className="p-0">
          {fees.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No fees match this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Fee item</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                    <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium">Record payment</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => (
                    <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <Link href={`/portal/admin/students/${f.studentId}`} className="hover:text-brand-700">{f.student.user.name}</Link>
                      </td>
                      <td className="px-4 py-2.5"><Badge tone="neutral">{f.student.classRef?.name}{f.student.classRef?.arm}</Badge></td>
                      <td className="px-4 py-2.5 text-slate-700">{f.feeType}</td>
                      <td className="px-4 py-2.5 text-right">{nairaFmt.format(Number(f.amount))}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-700">{nairaFmt.format(Number(f.amountPaid))}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{nairaFmt.format(Number(f.balance))}</td>
                      <td className="px-4 py-2.5"><Badge tone={feeTone[f.status]}>{f.status.toLowerCase()}</Badge></td>
                      <td className="px-4 py-2.5">
                        {f.status !== "PAID" && (
                          <form action={recordPayment} className="flex items-center gap-1 justify-end">
                            <input type="hidden" name="feeId" value={f.id} />
                            <input name="amount" type="number" min={0} step="500" placeholder="₦" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" required />
                            <input name="reference" type="text" placeholder="Ref" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                            <Button type="submit" variant="outline" className="text-[11px]">Record</Button>
                          </form>
                        )}
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
