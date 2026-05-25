import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Receipt, Download, Search, ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { resendPaymentReceipt } from "./actions";

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
const statusTone: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  SUCCESS: "success",
  PENDING: "warning",
  FAILED: "danger",
  REFUNDED: "neutral",
};

type SearchParams = {
  q?: string;
  method?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
  resent?: string;
  error?: string;
};

const PAGE_SIZE = 50;

export default async function PaymentsLedgerPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const q = (searchParams.q ?? "").trim();
  const method = (searchParams.method ?? "").toUpperCase();
  const status = (searchParams.status ?? "").toUpperCase();
  const from = searchParams.from;
  const to = searchParams.to;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where: Record<string, unknown> = {};
  if (["PAYSTACK", "CASH", "TRANSFER", "CHEQUE", "POS", "OTHER"].includes(method)) where.method = method;
  if (["SUCCESS", "PENDING", "FAILED", "REFUNDED"].includes(status)) where.status = status;
  if (from || to) {
    where.paidAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    };
  }
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: "insensitive" } },
      { fee: { student: { user: { name: { contains: q, mode: "insensitive" } } } } },
      { fee: { student: { admissionNumber: { contains: q, mode: "insensitive" } } } },
      { fee: { feeType: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [payments, total, sumAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        fee: {
          include: {
            student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
            term: { include: { session: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  const totalAmount = Number(sumAgg._sum.amount ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build CSV download URL preserving filters.
  const csvParams = new URLSearchParams();
  if (q) csvParams.set("q", q);
  if (method) csvParams.set("method", method);
  if (status) csvParams.set("status", status);
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  const csvUrl = `/api/accountant/payments/csv${csvParams.toString() ? `?${csvParams.toString()}` : ""}`;

  return (
    <PortalShell role="accountant">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/portal/accountant" className="text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
              <Receipt className="h-3.5 w-3.5" /> Ledger
            </p>
            <h1 className="text-2xl font-bold text-brand-900">Payments ledger</h1>
            <p className="text-sm text-slate-500">Every payment recorded across all terms.</p>
          </div>
        </div>
        <a href={csvUrl} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      {searchParams.resent && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Receipt resent to {decodeURIComponent(searchParams.resent)}'s parent(s).
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <CardBody className="py-3">
          <form className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm" method="GET">
            <div className="col-span-2 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name, adm#, fee, reference..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <select name="method" defaultValue={method ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">All methods</option>
              {Object.entries(methodLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
            <input type="date" name="from" defaultValue={from ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
            <input type="date" name="to" defaultValue={to ?? ""} className="rounded-lg border border-slate-300 px-3 py-2" />
            <div className="col-span-2 md:col-span-6 flex items-center gap-2">
              <Button type="submit">Apply filters</Button>
              {(q || method || status || from || to) && (
                <Link href="/portal/accountant/payments" className="text-xs font-medium text-slate-600 hover:text-slate-900">Clear</Link>
              )}
              <span className="ml-auto text-xs text-slate-500">
                <strong className="text-slate-900">{total}</strong> result{total === 1 ? "" : "s"}
                {total > 0 && <> · <strong className="text-emerald-700">{nairaFmt.format(totalAmount)}</strong> total</>}
              </span>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <Badge tone="neutral">page {page}/{Math.max(1, totalPages)}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {payments.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No payments match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Fee</th>
                    <th className="text-left px-4 py-2.5 font-medium">Method</th>
                    <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                    <th className="text-center px-4 py-2.5 font-medium">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-700">
                        {p.paidAt ? dateTimeFmt.format(p.paidAt) : dateTimeFmt.format(p.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{p.fee.student.user.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.fee.student.admissionNumber}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.fee.student.classRef ? (
                          <Badge tone="neutral">{p.fee.student.classRef.name}{p.fee.student.classRef.arm}</Badge>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-slate-900">{p.fee.feeType}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.fee.term.name.toLowerCase()} · {p.fee.term.session.name}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={methodTone[p.method]}>{methodLabel[p.method]}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 max-w-[180px] truncate" title={p.reference}>
                        {p.reference}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{nairaFmt.format(Number(p.amount))}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge tone={statusTone[p.status]}>{p.status.toLowerCase()}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-end">
                          <Link href={`/portal/parent/fees/receipt/${p.id}`} className="text-xs font-medium text-brand-700 hover:underline">Receipt</Link>
                          {p.status === "SUCCESS" && (
                            <form action={resendPaymentReceipt}>
                              <input type="hidden" name="paymentId" value={p.id} />
                              <button type="submit" title="Re-send receipt by email" className="text-xs font-medium text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1">
                                <Mail className="h-3 w-3" /> Resend
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-xs text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/portal/accountant/payments?${new URLSearchParams({ ...searchParams, page: String(page - 1) }).toString()}`}>
                <Button variant="outline" className="text-xs">← Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/portal/accountant/payments?${new URLSearchParams({ ...searchParams, page: String(page + 1) }).toString()}`}>
                <Button variant="outline" className="text-xs">Next →</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
