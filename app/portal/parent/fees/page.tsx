import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren, getActiveContext } from "@/lib/auth-helpers";
import { CreditCard, Wallet, AlertCircle, Phone } from "lucide-react";
import { SCHOOL } from "@/lib/constants";
import { PayNowButton } from "@/components/PayNowButton";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { student?: string };

const feeTone: Record<string, "success" | "warning" | "danger"> = {
  PAID: "success",
  PARTIAL: "warning",
  UNPAID: "danger",
};

export default async function ParentFeesPage({ searchParams }: { searchParams: SearchParams }) {
  const parent = await getCurrentParentWithChildren();
  const { term, session } = await getActiveContext();

  const children = parent.children.map(c => c.student);
  if (children.length === 0) {
    return (
      <PortalShell role="parent">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No children linked yet</p>
          <p className="text-sm text-slate-500 mt-1">Contact the school office to link your child's account.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedStudent = searchParams.student
    ? children.find(c => c.id === searchParams.student) ?? children[0]
    : children[0];

  const fees = await prisma.fee.findMany({
    where: term
      ? { studentId: selectedStudent.id, termId: term.id }
      : { studentId: selectedStudent.id },
    orderBy: { createdAt: "asc" },
  });

  const totals = fees.reduce(
    (acc, f) => ({
      billed: acc.billed + Number(f.amount),
      paid: acc.paid + Number(f.amountPaid),
      balance: acc.balance + Number(f.balance),
    }),
    { billed: 0, paid: 0, balance: 0 },
  );

  return (
    <PortalShell role="parent">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Fees & Payments</h1>
        <p className="text-sm text-slate-500">
          {term ? `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term` : ""}
          {session ? ` · Session ${session.name}` : ""} · {selectedStudent.user.name}
          {selectedStudent.classRef && ` · ${selectedStudent.classRef.name}${selectedStudent.classRef.arm}`}
        </p>
      </div>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {children.map(c => (
            <Link
              key={c.id}
              href={`/portal/parent/fees?student=${c.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${c.id === selectedStudent.id ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-brand-300"}`}
            >
              {c.user.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total billed" value={nairaFmt.format(totals.billed)} icon={<Wallet className="h-5 w-5" />} accent="brand" />
        <StatCard label="Paid" value={nairaFmt.format(totals.paid)} icon={<CreditCard className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Outstanding" value={nairaFmt.format(totals.balance)} icon={<AlertCircle className="h-5 w-5" />} accent={totals.balance > 0 ? "rose" : "emerald"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee statement</CardTitle>
          {totals.balance > 0 && (
            <Badge tone="warning">{nairaFmt.format(totals.balance)} outstanding</Badge>
          )}
        </CardHeader>
        <CardBody className="p-0">
          {fees.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No fees charged yet</p>
              <p className="text-sm text-slate-500 mt-1">Fee charges for this term haven't been published.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Fee item</th>
                    <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                    <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Due</th>
                    <th className="text-right px-4 py-2.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => {
                    const balance = Number(f.balance);
                    return (
                      <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{f.feeType}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{nairaFmt.format(Number(f.amount))}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">{nairaFmt.format(Number(f.amountPaid))}</td>
                        <td className="px-4 py-2.5 text-right text-slate-900 font-medium">{nairaFmt.format(balance)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={feeTone[f.status] ?? "neutral"}>{f.status.toLowerCase()}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[12px]">{f.dueDate ? dateFmt.format(f.dueDate) : "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <PayNowButton feeId={f.id} defaultAmount={balance} maxAmount={balance} enabled={balance > 0} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right">{nairaFmt.format(totals.billed)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">{nairaFmt.format(totals.paid)}</td>
                    <td className="px-4 py-2.5 text-right">{nairaFmt.format(totals.balance)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {totals.balance > 0 && (
        <Card className="mt-6 bg-gradient-to-br from-brand-900 to-brand-700 text-white border-0">
          <CardBody>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold">Online payments are powered by Paystack</p>
                <p className="mt-1 text-sm text-slate-200">Click "Pay now" on any unpaid item above to checkout securely with card, bank transfer or USSD. You'll get an email receipt on success.</p>
              </div>
              <a
                href={`tel:${SCHOOL.phoneIntl}`}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg text-sm"
              >
                <Phone className="h-4 w-4" /> Prefer to call: {SCHOOL.phone}
              </a>
            </div>
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
