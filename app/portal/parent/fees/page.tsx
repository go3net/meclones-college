"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge, Modal, Input, Label, Select, Toast } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore, updateStore, pushWhatsApp } from "@/lib/store";
import { studentsByParent, classById, formatNaira, Invoice } from "@/lib/mock-data";
import { CreditCard, Download, CheckCircle2, Lock } from "lucide-react";

export default function ParentFees() {
  const [user, setUser] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);
  const [payOpen, setPayOpen] = useState<Invoice | null>(null);
  const [receiptOpen, setReceiptOpen] = useState<Invoice | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;

  const children = studentsByParent(user.linkedId);
  const invoices = store.invoices.filter(i => children.some(c => c.id === i.studentId));

  return (
    <PortalShell role="parent">
      <Toast message={toast} onClose={() => setToast("")} />
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Fees & Payments</h1>
      <p className="text-sm text-slate-500 mb-6">View invoices, pay online via Paystack, and download receipts.</p>

      <div className="space-y-4">
        {invoices.map(inv => {
          const child = children.find(c => c.id === inv.studentId);
          const bal = inv.amount - inv.paid;
          return (
            <Card key={inv.id}>
              <CardHeader>
                <div>
                  <CardTitle>{child?.name} · {classById(child?.classId || "")?.name}</CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">{inv.term} · Due {inv.dueDate}</p>
                </div>
                <Badge tone={inv.status === "paid" ? "success" : inv.status === "partial" ? "warning" : "danger"}>{inv.status}</Badge>
              </CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-xl font-bold text-slate-900">{formatNaira(inv.amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Outstanding</p>
                    <p className={`text-xl font-bold ${bal > 0 ? "text-amber-700" : "text-emerald-700"}`}>{formatNaira(bal)}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${(inv.paid / inv.amount) * 100}%` }} />
                </div>
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    {inv.items.map((it, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-2 text-slate-700">{it.label}</td>
                        <td className="py-2 text-right font-medium">{formatNaira(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex gap-2 flex-wrap">
                  {bal > 0 && <Button variant="gold" onClick={() => setPayOpen(inv)}><CreditCard className="h-4 w-4" /> Pay Now</Button>}
                  <Button variant="outline" onClick={() => setReceiptOpen(inv)}><Download className="h-4 w-4" /> Receipt</Button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Payment modal */}
      {payOpen && (
        <PaymentModal
          invoice={payOpen}
          onClose={() => setPayOpen(null)}
          onSuccess={(amount) => {
            updateStore(s => {
              const inv = s.invoices.find(i => i.id === payOpen.id)!;
              inv.paid += amount;
              if (inv.paid >= inv.amount) inv.status = "paid";
              else if (inv.paid > 0) inv.status = "partial";
              s.payments.unshift({
                id: "pay-" + Date.now(),
                invoiceId: inv.id,
                amount,
                method: "paystack",
                reference: "PSK_DEMO_" + Date.now(),
                date: new Date().toISOString().slice(0, 10),
              });
            });
            pushWhatsApp({
              to: user.phone,
              recipientName: user.name,
              trigger: "Payment Confirmed",
              message: `Dear ${user.name.split(" ")[0]}, your payment of ${formatNaira(amount)} has been received. Thank you. — Meclones College`,
            });
            setPayOpen(null);
            setToast("Payment successful! WhatsApp confirmation sent.");
            setRefresh(r => r + 1);
          }}
        />
      )}

      {/* Receipt modal */}
      {receiptOpen && <ReceiptModal invoice={receiptOpen} student={children.find(c => c.id === receiptOpen.studentId)} onClose={() => setReceiptOpen(null)} />}
    </PortalShell>
  );
}

function PaymentModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: (amount: number) => void }) {
  const bal = invoice.amount - invoice.paid;
  const [amount, setAmount] = useState(bal);
  const [step, setStep] = useState<"form" | "processing" | "done">("form");

  const pay = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("done");
      setTimeout(() => onSuccess(amount), 800);
    }, 1500);
  };

  return (
    <Modal open onClose={onClose} title={step === "form" ? "Pay with Paystack (Demo)" : ""} size="md">
      {step === "form" && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="text-slate-500">Paying for</p>
            <p className="font-medium text-slate-900">{invoice.term}</p>
            <p className="text-slate-500 mt-2">Outstanding</p>
            <p className="font-medium text-slate-900">{formatNaira(bal)}</p>
          </div>
          <div>
            <Label>Amount</Label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} max={bal} min={1000} />
            <div className="flex gap-2 mt-2">
              <button onClick={() => setAmount(bal)} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Full amount</button>
              <button onClick={() => setAmount(Math.round(bal / 2))} className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded">Half</button>
            </div>
          </div>
          <div>
            <Label>Card Number (demo)</Label>
            <Input placeholder="4084 0840 8408 4081" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Expiry</Label><Input placeholder="12/28" /></div>
            <div><Label>CVV</Label><Input placeholder="123" /></div>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Secured by Paystack · Demo simulation</div>
          <Button onClick={pay} variant="gold" className="w-full">Pay {formatNaira(amount)}</Button>
        </div>
      )}
      {step === "processing" && (
        <div className="py-10 text-center">
          <div className="h-12 w-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600">Processing payment...</p>
        </div>
      )}
      {step === "done" && (
        <div className="py-10 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-3" />
          <p className="text-xl font-bold text-brand-900">Payment Successful</p>
          <p className="text-sm text-slate-500 mt-1">{formatNaira(amount)} confirmed</p>
        </div>
      )}
    </Modal>
  );
}

function ReceiptModal({ invoice, student, onClose }: { invoice: Invoice; student: any; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="Receipt" size="md" footer={<><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => window.print()}><Download className="h-4 w-4" /> Print / PDF</Button></>}>
      <div className="bg-white p-5 rounded">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-bold text-brand-900">Meclones College Lekki</h2>
            <p className="text-xs text-slate-500">12 Admiralty Way, Lekki, Lagos</p>
          </div>
          <Badge tone="success">PAID</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-slate-500">Receipt No</p><p className="font-medium">RCP-{invoice.id.toUpperCase()}</p></div>
          <div><p className="text-slate-500">Date</p><p className="font-medium">{new Date().toLocaleDateString()}</p></div>
          <div><p className="text-slate-500">Student</p><p className="font-medium">{student?.name}</p></div>
          <div><p className="text-slate-500">Term</p><p className="font-medium">{invoice.term}</p></div>
        </div>
        <table className="mt-4 w-full text-sm border-t border-slate-200">
          {invoice.items.map((it, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2 text-slate-700">{it.label}</td>
              <td className="py-2 text-right font-medium">{formatNaira(it.amount)}</td>
            </tr>
          ))}
          <tr className="font-bold"><td className="py-3">Total Paid</td><td className="py-3 text-right text-emerald-700">{formatNaira(invoice.paid)}</td></tr>
        </table>
        <p className="text-xs text-slate-400 mt-4 text-center">Thank you for your payment. This is a system-generated receipt.</p>
      </div>
    </Modal>
  );
}
