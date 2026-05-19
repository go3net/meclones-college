import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { SCHOOL } from "@/lib/constants";
import { PrintButton } from "@/components/PrintButton";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "full", timeStyle: "short" });

/**
 * Printable receipt for a successful payment. Auth-gated:
 *   - admins/director/super-admin/accountant — any payment
 *   - parent — only payments against their linked children's fees
 *   - student — only their own
 */
export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: {
      fee: {
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true } },
              classRef: true,
              parentLinks: { include: { parent: true } },
            },
          },
          term: { include: { session: true } },
        },
      },
    },
  });
  if (!payment) notFound();

  // Authorization
  const role = user.role;
  let allowed = false;
  if (["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(role)) {
    allowed = true;
  } else if (role === "STUDENT") {
    const me = await prisma.student.findUnique({ where: { userId: user.id } });
    allowed = !!me && me.id === payment.fee.studentId;
  } else if (role === "PARENT") {
    const me = await prisma.parent.findUnique({ where: { userId: user.id } });
    allowed = !!me && payment.fee.student.parentLinks.some(l => l.parentId === me.id);
  }
  if (!allowed) redirect("/portal/me");

  const s = payment.fee.student;
  const isSuccess = payment.status === "SUCCESS";

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="no-print bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/portal/me" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to portal
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-3xl mx-auto bg-white shadow-card print:shadow-none my-6 print:my-0 p-10 print:p-8">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-brand-900 pb-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-900">{SCHOOL.name}</h1>
            <p className="text-xs text-slate-600 mt-1">{SCHOOL.address}</p>
            <p className="text-xs text-slate-600">Tel: {SCHOOL.phone} · {SCHOOL.email}</p>
            <p className="text-xs text-gold-700 font-semibold mt-1">{SCHOOL.tagline}</p>
          </div>
          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center ring-2 ring-gold-400/30">
            <span className="text-gold-300 font-serif font-bold text-2xl leading-none">M</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <h2 className="font-display text-xl font-bold text-brand-900">PAYMENT RECEIPT</h2>
          {isSuccess ? (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded">
              <CheckCircle2 className="h-3 w-3" /> PAID
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-semibold px-2 py-0.5 rounded">
              {payment.status}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600 mb-6">Reference: <span className="font-mono text-brand-700">{payment.reference}</span></p>

        {/* Receipt block */}
        <table className="w-full text-sm mb-6">
          <tbody>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Student</td><td className="py-2 text-right font-semibold text-slate-900">{s.user.name}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Admission no.</td><td className="py-2 text-right font-mono text-slate-900">{s.admissionNumber}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Class</td><td className="py-2 text-right text-slate-900">{s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "—"}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Term · Session</td><td className="py-2 text-right text-slate-900">{payment.fee.term.name.charAt(0)}{payment.fee.term.name.slice(1).toLowerCase()} · {payment.fee.term.session.name}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Fee item</td><td className="py-2 text-right text-slate-900">{payment.fee.feeType}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Method</td><td className="py-2 text-right text-slate-900">{payment.method.toLowerCase()}{payment.channel && ` · ${payment.channel}`}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2 text-slate-500">Paid on</td><td className="py-2 text-right text-slate-900">{payment.paidAt ? dateFmt.format(payment.paidAt) : "—"}</td></tr>
          </tbody>
        </table>

        <table className="w-full text-sm mb-8">
          <tbody>
            <tr className="bg-emerald-50">
              <td className="px-3 py-3 font-semibold text-slate-900">Amount paid</td>
              <td className="px-3 py-3 text-right text-2xl font-bold text-emerald-700">{nairaFmt.format(Number(payment.amount))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-500">Original fee charge</td>
              <td className="px-3 py-2 text-right text-slate-700">{nairaFmt.format(Number(payment.fee.amount))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-500">Remaining balance</td>
              <td className="px-3 py-2 text-right font-semibold text-slate-900">{nairaFmt.format(Number(payment.fee.balance))}</td>
            </tr>
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-4 border-t border-slate-200 text-sm">
          <div>
            <div className="h-12 border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Accountant / Bursar</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Principal / Director</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8">
          This is an electronically-generated receipt and is valid without a stamp.
        </p>
        <p className="text-center text-[11px] text-slate-400">
          Generated {dateFmt.format(new Date())}
        </p>
      </div>

      <div className="h-6 print:hidden" />
    </div>
  );
}
