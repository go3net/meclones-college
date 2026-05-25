import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, Textarea, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { markReconciled, unmarkReconciled } from "./actions";
import { ArrowLeft, AlertCircle, CheckCircle2, ScrollText, Building2, Undo2 } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
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

type SearchParams = { method?: string; view?: "unreconciled" | "reconciled"; done?: string; error?: string; undone?: string };

export default async function ReconciliationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const view = searchParams.view ?? "unreconciled";
  const methodFilter = (searchParams.method ?? "").toUpperCase();

  const where: Record<string, unknown> = { status: "SUCCESS" };
  if (view === "unreconciled") {
    where.reconciledAt = null;
  } else {
    where.reconciledAt = { not: null };
  }
  if (["PAYSTACK", "CASH", "TRANSFER", "CHEQUE", "POS", "OTHER"].includes(methodFilter)) {
    where.method = methodFilter;
  }

  const [payments, unreconciledTotal, reconciledTotal, unreconciledCount, reconciledCount] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: 200,
      include: {
        fee: {
          include: {
            student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", reconciledAt: null },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", reconciledAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.count({ where: { status: "SUCCESS", reconciledAt: null } }),
    prisma.payment.count({ where: { status: "SUCCESS", reconciledAt: { not: null } } }),
  ]);

  const unreconciledNaira = Number(unreconciledTotal._sum.amount ?? 0);
  const reconciledNaira = Number(reconciledTotal._sum.amount ?? 0);

  return (
    <PortalShell role="accountant">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/accountant" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" /> Reconciliation
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Bank reconciliation</h1>
          <p className="text-sm text-slate-500">Match payments against your bank statement and mark them reconciled.</p>
        </div>
      </div>

      {searchParams.done && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {searchParams.done} payment{searchParams.done === "1" ? "" : "s"} marked reconciled.
        </div>
      )}
      {searchParams.undone && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <Undo2 className="h-4 w-4" /> Reconciliation undone.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Unreconciled" value={unreconciledCount} hint={`${nairaFmt.format(unreconciledNaira)} unmatched`} accent="rose" />
        <StatCard label="Reconciled" value={reconciledCount} hint={`${nairaFmt.format(reconciledNaira)} matched`} accent="emerald" />
        <StatCard
          label="Match rate"
          value={
            (reconciledCount + unreconciledCount) > 0
              ? `${Math.round((reconciledCount / (reconciledCount + unreconciledCount)) * 100)}%`
              : "—"
          }
          accent="brand"
        />
        <StatCard label="Loaded" value={payments.length} hint={view === "unreconciled" ? "to review" : "to spot-check"} accent="sky" />
      </div>

      {/* View + method filters */}
      <Card className="mb-4">
        <CardBody className="py-3">
          <form method="GET" className="flex flex-wrap items-center gap-3 text-sm">
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              <Link
                href={`/portal/accountant/reconciliation?view=unreconciled${methodFilter ? `&method=${methodFilter}` : ""}`}
                className={`px-3 py-1.5 text-sm ${view === "unreconciled" ? "bg-brand-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                To reconcile ({unreconciledCount})
              </Link>
              <Link
                href={`/portal/accountant/reconciliation?view=reconciled${methodFilter ? `&method=${methodFilter}` : ""}`}
                className={`px-3 py-1.5 text-sm ${view === "reconciled" ? "bg-brand-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                Reconciled ({reconciledCount})
              </Link>
            </div>
            <input type="hidden" name="view" value={view} />
            <select name="method" defaultValue={methodFilter ?? ""} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">All methods</option>
              {Object.entries(methodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Button type="submit" variant="outline">Filter</Button>
            {methodFilter && (
              <Link href={`/portal/accountant/reconciliation?view=${view}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">Clear method</Link>
            )}
            <p className="ml-auto text-xs text-slate-500">
              Tip: filter to <strong>Transfer</strong> or <strong>POS</strong> to focus on what shows up on your bank statement.
            </p>
          </form>
        </CardBody>
      </Card>

      {view === "unreconciled" ? (
        <form action={markReconciled}>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle><ScrollText className="h-4 w-4 inline mr-1" /> Mark selected reconciled</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label>Bank reference / deposit slip #</Label>
                  <Input name="bankReference" placeholder="e.g. GTB-2026-05-25-TXN-4421" />
                </div>
                <div>
                  <Label>Note (optional)</Label>
                  <Input name="reconciliationNote" placeholder="Anything worth recording" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Tick the rows you want to mark reconciled, then click the button at the bottom.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{view === "unreconciled" ? "Unreconciled" : "Reconciled"} payments</CardTitle>
              <Badge tone="neutral">{payments.length} loaded</Badge>
            </CardHeader>
            <CardBody className="p-0">
              {payments.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
                  <p className="font-medium text-slate-700">Nothing to reconcile here.</p>
                  <p className="text-sm text-slate-500 mt-1">Every {methodFilter ? methodLabel[methodFilter].toLowerCase() : ""} payment is matched.</p>
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 w-8"></th>
                      <th className="text-left px-3 py-2.5 font-medium">Date</th>
                      <th className="text-left px-3 py-2.5 font-medium">Student</th>
                      <th className="text-left px-3 py-2.5 font-medium">Fee</th>
                      <th className="text-left px-3 py-2.5 font-medium">Method</th>
                      <th className="text-left px-3 py-2.5 font-medium">Reference</th>
                      <th className="text-right px-3 py-2.5 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            name="paymentIds"
                            value={p.id}
                            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          {p.paidAt ? dateTimeFmt.format(p.paidAt) : dateTimeFmt.format(p.createdAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-900">{p.fee.student.user.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.fee.student.admissionNumber}{p.fee.student.classRef && ` · ${p.fee.student.classRef.name}${p.fee.student.classRef.arm}`}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">{p.fee.feeType}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={methodTone[p.method]}>{methodLabel[p.method]}</Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500 max-w-[180px] truncate" title={p.reference}>
                          {p.reference}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{nairaFmt.format(Number(p.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>

          {payments.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button type="submit" variant="gold"><CheckCircle2 className="h-4 w-4" /> Mark selected as reconciled</Button>
            </div>
          )}
        </form>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Reconciled payments</CardTitle>
            <Badge tone="neutral">{payments.length} loaded</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {payments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">Nothing reconciled yet.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium">Paid on</th>
                    <th className="text-left px-3 py-2.5 font-medium">Student / Fee</th>
                    <th className="text-left px-3 py-2.5 font-medium">Method</th>
                    <th className="text-left px-3 py-2.5 font-medium">Bank reference</th>
                    <th className="text-left px-3 py-2.5 font-medium">Reconciled by</th>
                    <th className="text-right px-3 py-2.5 font-medium">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                        {p.paidAt ? dateTimeFmt.format(p.paidAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{p.fee.student.user.name}</div>
                        <div className="text-[11px] text-slate-500">{p.fee.feeType}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={methodTone[p.method]}>{methodLabel[p.method]}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <div>{p.bankReference ?? "—"}</div>
                        {p.reconciliationNote && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{p.reconciliationNote}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-700">
                        {p.reconciledByName ?? "—"}
                        {p.reconciledAt && <div className="text-[11px] text-slate-500">{dateTimeFmt.format(p.reconciledAt)}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">{nairaFmt.format(Number(p.amount))}</td>
                      <td className="px-3 py-2.5">
                        <form action={unmarkReconciled}>
                          <input type="hidden" name="paymentId" value={p.id} />
                          <button type="submit" className="text-[11px] text-slate-500 hover:text-rose-700 inline-flex items-center gap-1">
                            <Undo2 className="h-3 w-3" /> Undo
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
      )}
    </PortalShell>
  );
}
