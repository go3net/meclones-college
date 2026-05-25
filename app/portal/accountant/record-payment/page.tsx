import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { recordManualPayment } from "./actions";
import { ArrowLeft, AlertCircle, Receipt, Save } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type SearchParams = { student?: string; fee?: string; error?: string };

export default async function RecordPaymentPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();

  // List unpaid + partial fees, grouped by student class for picker.
  const outstandingFees = await prisma.fee.findMany({
    where: { balance: { gt: 0 }, ...(term ? { termId: term.id } : {}) },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
        },
      },
      term: { include: { session: { select: { name: true } } } },
    },
    orderBy: [
      { student: { classRef: { name: "asc" } } },
      { student: { user: { name: "asc" } } },
      { feeType: "asc" },
    ],
  });

  // Group fees by student → list of fees per child.
  const byStudent = new Map<string, { studentLabel: string; classLabel: string; fees: typeof outstandingFees }>();
  for (const f of outstandingFees) {
    const classLabel = f.student.classRef ? `${f.student.classRef.name}${f.student.classRef.arm}` : "Unassigned";
    const key = f.studentId;
    if (!byStudent.has(key)) {
      byStudent.set(key, {
        studentLabel: `${f.student.user.name} · ${f.student.admissionNumber}`,
        classLabel,
        fees: [],
      });
    }
    byStudent.get(key)!.fees.push(f);
  }

  const preselectedFee = searchParams.fee
    ? outstandingFees.find(f => f.id === searchParams.fee)
    : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <PortalShell role="accountant">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/accountant" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
            <Receipt className="h-3.5 w-3.5" /> Record payment
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Manual payment entry</h1>
          <p className="text-sm text-slate-500">For cash, transfer, cheque or POS payments that didn't go through Paystack.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {outstandingFees.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Receipt className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
            <p className="font-medium text-slate-700">No outstanding fees</p>
            <p className="text-sm text-slate-500 mt-1">Every student is paid up for the current term.</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Payment details</CardTitle></CardHeader>
          <CardBody>
            <form action={recordManualPayment} className="space-y-4">
              <div>
                <Label>Outstanding fee *</Label>
                <Select name="feeId" required defaultValue={preselectedFee?.id ?? ""}>
                  <option value="" disabled>Select a student / fee…</option>
                  {Array.from(byStudent.values()).map(group => (
                    <optgroup key={group.studentLabel} label={`${group.classLabel} — ${group.studentLabel}`}>
                      {group.fees.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.feeType} · billed {nairaFmt.format(Number(f.amount))} · owes {nairaFmt.format(Number(f.balance))} ({f.term.name.toLowerCase()} · {f.term.session.name})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </Select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {outstandingFees.length} unpaid fee{outstandingFees.length === 1 ? "" : "s"} across {byStudent.size} student{byStudent.size === 1 ? "" : "s"}.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Amount received (₦) *</Label>
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 150000"
                    inputMode="decimal"
                  />
                  {preselectedFee && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Balance on selected fee: <strong className="text-rose-700">{nairaFmt.format(Number(preselectedFee.balance))}</strong>
                    </p>
                  )}
                </div>

                <div>
                  <Label>Payment method *</Label>
                  <Select name="method" required defaultValue="CASH">
                    <option value="CASH">Cash</option>
                    <option value="TRANSFER">Bank transfer</option>
                    <option value="POS">POS</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Reference / teller #</Label>
                  <Input name="reference" placeholder="Optional — bank reference, cheque number, etc." />
                  <p className="text-[11px] text-slate-500 mt-1">Leave blank to auto-generate.</p>
                </div>
                <div>
                  <Label>Date received</Label>
                  <Input name="paidAt" type="date" defaultValue={today} />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} placeholder="Anything else worth recording (e.g. 'Paid by uncle on parent's behalf')." />
              </div>

              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                <strong>Receipt will be issued automatically.</strong> Parent + student get a bell ping and an email with the receipt link. The fee balance and status update immediately.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Link href="/portal/accountant"><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Record payment</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}
