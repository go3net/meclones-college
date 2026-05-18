import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function DebtorsPage() {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();
  if (!term) return null;

  const fees = await prisma.fee.findMany({
    where: { termId: term.id, NOT: { status: "PAID" } },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
          parentLinks: { include: { parent: { include: { user: { select: { name: true, phone: true, email: true } } } } } },
        },
      },
    },
  });

  const byStudent = fees.reduce((acc, f) => {
    if (!acc.has(f.studentId)) acc.set(f.studentId, { student: f.student, billed: 0, paid: 0, balance: 0 });
    const x = acc.get(f.studentId)!;
    x.billed += Number(f.amount);
    x.paid += Number(f.amountPaid);
    x.balance += Number(f.balance);
    return acc;
  }, new Map<string, { student: (typeof fees)[number]["student"]; billed: number; paid: number; balance: number }>());

  const debtors = Array.from(byStudent.values()).sort((a, b) => b.balance - a.balance);

  return (
    <PortalShell role="accountant">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Debtors</h1>
        <p className="text-sm text-slate-500">{debtors.length} students with outstanding balances for the current term.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All debtors</CardTitle>
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
                    <th className="text-left px-4 py-2.5 font-medium">Parent / Guardian</th>
                    <th className="text-right px-4 py-2.5 font-medium">Billed</th>
                    <th className="text-right px-4 py-2.5 font-medium">Paid</th>
                    <th className="text-right px-4 py-2.5 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map(r => {
                    const p = r.student.parentLinks[0]?.parent.user;
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
                          {p ? (
                            <div>
                              <div className="text-slate-800">{p.name}</div>
                              {p.phone && <div className="text-slate-500 inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {p.phone}</div>}
                              {p.email && <div className="text-slate-500 inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {p.email}</div>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{nairaFmt.format(r.billed)}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-700">{nairaFmt.format(r.paid)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-rose-700">{nairaFmt.format(r.balance)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
