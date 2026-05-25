import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, StatCard } from "@/components/ui";
import { getSessionUser } from "@/lib/auth-helpers";
import { requireRole } from "@/lib/auth-helpers";
import { loadFinanceReportData, deriveRangeLabel } from "@/lib/finance-report-data";
import { ArrowLeft, AlertCircle, FileText, Download, Calendar, Filter } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const methodLabel: Record<string, string> = {
  PAYSTACK: "Paystack",
  CASH: "Cash",
  TRANSFER: "Transfer",
  CHEQUE: "Cheque",
  POS: "POS",
  OTHER: "Other",
};

type SearchParams = { preset?: string; from?: string; to?: string };

function resolveRange(preset: string, fromRaw?: string, toRaw?: string): { from: Date; to: Date } {
  const now = new Date();
  if (preset === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  if (preset === "week") {
    const s = new Date(now); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  if (preset === "term") {
    const s = new Date(now); s.setDate(s.getDate() - 90); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  if (preset === "custom" && fromRaw && toRaw) {
    const s = new Date(fromRaw); s.setHours(0, 0, 0, 0);
    const e = new Date(toRaw); e.setHours(23, 59, 59, 999);
    return { from: s, to: e };
  }
  // month default
  const s = new Date(now); s.setDate(1); s.setHours(0, 0, 0, 0);
  const e = new Date(now); e.setHours(23, 59, 59, 999);
  return { from: s, to: e };
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const preset = searchParams.preset ?? "month";
  const { from, to } = resolveRange(preset, searchParams.from, searchParams.to);
  const rangeLabel = deriveRangeLabel(from, to, preset);

  const data = await loadFinanceReportData({ from, to, rangeLabel, generatedBy: user.name });

  const pdfParams = new URLSearchParams({ preset });
  if (preset === "custom" && searchParams.from && searchParams.to) {
    pdfParams.set("from", searchParams.from);
    pdfParams.set("to", searchParams.to);
  }
  const pdfUrl = `/api/accountant/finance-report.pdf?${pdfParams.toString()}`;

  return (
    <PortalShell role="accountant">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/portal/accountant" className="text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Reports
            </p>
            <h1 className="text-2xl font-bold text-brand-900">Finance reports</h1>
            <p className="text-sm text-slate-500">Per-range collection summary with PDF export.</p>
          </div>
        </div>
        <a href={pdfUrl} target="_blank" rel="noreferrer noopener"
           className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          <Download className="h-4 w-4" /> Download PDF
        </a>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle><Filter className="h-4 w-4 inline mr-1" /> Date range</CardTitle></CardHeader>
        <CardBody>
          <form method="GET" className="flex flex-wrap items-end gap-3 text-sm">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">Preset</label>
              <select name="preset" defaultValue={preset} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
                <option value="term">Last 90 days</option>
                <option value="custom">Custom range…</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">From</label>
              <input
                name="from"
                type="date"
                defaultValue={searchParams.from ?? from.toISOString().slice(0, 10)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">To</label>
              <input
                name="to"
                type="date"
                defaultValue={searchParams.to ?? to.toISOString().slice(0, 10)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </div>
            <Button type="submit" variant="outline">Apply</Button>
            <span className="ml-auto text-xs text-slate-500 inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {rangeLabel} ({dateFmt.format(from)} – {dateFmt.format(to)})
            </span>
          </form>
        </CardBody>
      </Card>

      {!data ? (
        <Card>
          <CardBody className="text-center py-12">
            <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No active term — set one before generating reports.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard label="Billed (term)" value={nairaFmt.format(data.totals.billed)} hint={`${data.totals.studentsBilled} students`} accent="brand" />
            <StatCard label="Collected (range)" value={nairaFmt.format(data.totals.collected)} hint={`${data.totals.paymentsCount} payments`} accent="emerald" />
            <StatCard label="Outstanding" value={nairaFmt.format(data.totals.outstanding)} hint={`${data.totals.debtors} debtors`} accent={data.totals.outstanding > 0 ? "rose" : "emerald"} />
            <StatCard label="Collection %" value={data.totals.billed > 0 ? `${Math.round((data.totals.collected / data.totals.billed) * 100)}%` : "—"} accent="amber" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle>By payment method</CardTitle><Badge tone="neutral">{data.methodBreakdown.length}</Badge></CardHeader>
              <CardBody className="p-0">
                {data.methodBreakdown.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">No payments in range.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">Method</th>
                        <th className="text-right px-4 py-2 font-medium">Count</th>
                        <th className="text-right px-4 py-2 font-medium">Amount</th>
                        <th className="text-right px-4 py-2 font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.methodBreakdown.map(m => {
                        const share = data.totals.collected > 0 ? Math.round((m.amount / data.totals.collected) * 100) : 0;
                        return (
                          <tr key={m.method} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-medium text-brand-900">{methodLabel[m.method] ?? m.method}</td>
                            <td className="px-4 py-2 text-right">{m.count}</td>
                            <td className="px-4 py-2 text-right font-semibold text-emerald-700">{nairaFmt.format(m.amount)}</td>
                            <td className="px-4 py-2 text-right">{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><CardTitle>By fee type</CardTitle><Badge tone="neutral">{data.feeTypeBreakdown.length}</Badge></CardHeader>
              <CardBody className="p-0">
                {data.feeTypeBreakdown.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-6">No billed fees this term.</p>
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
                      {data.feeTypeBreakdown.map(f => (
                        <tr key={f.feeType} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-medium text-brand-900">{f.feeType}</td>
                          <td className="px-4 py-2 text-right">{nairaFmt.format(f.billed)}</td>
                          <td className="px-4 py-2 text-right text-emerald-700">{nairaFmt.format(f.paid)}</td>
                          <td className="px-4 py-2 text-right font-semibold">{f.collectionPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Per-class collection (term-to-date)</CardTitle><Badge tone="neutral">{data.classBreakdown.length}</Badge></CardHeader>
            <CardBody className="p-0">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Class</th>
                    <th className="text-right px-4 py-2 font-medium">Billed</th>
                    <th className="text-right px-4 py-2 font-medium">Paid</th>
                    <th className="text-right px-4 py-2 font-medium">Balance</th>
                    <th className="text-right px-4 py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.classBreakdown.map(c => (
                    <tr key={c.className} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-semibold text-brand-900">{c.className}</td>
                      <td className="px-4 py-2 text-right">{nairaFmt.format(c.billed)}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">{nairaFmt.format(c.paid)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-rose-700">{nairaFmt.format(c.balance)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${c.collectionPct >= 80 ? "text-emerald-700" : c.collectionPct >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                        {c.collectionPct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      )}
    </PortalShell>
  );
}
