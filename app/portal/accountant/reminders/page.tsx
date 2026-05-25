import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Label, Select, Textarea, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { sendFeeReminders } from "./actions";
import { ArrowLeft, AlertCircle, Send, Users, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type SearchParams = { class?: string; sent?: string; error?: string };

export default async function RemindersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term } = await getActiveContext();

  // Tally debtors per class so the accountant can preview the blast.
  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
    select: { id: true, name: true, arm: true },
  });

  const fees = term ? await prisma.fee.findMany({
    where: { termId: term.id, balance: { gt: 0 } },
    include: {
      student: {
        select: {
          id: true, classId: true,
          parentLinks: {
            select: { parent: { select: { user: { select: { email: true } } } } },
          },
        },
      },
    },
  }) : [];

  // Per-class: debtor students, total outstanding, count of parents with email.
  const byClass = new Map<string, { name: string; debtorStudents: Set<string>; outstanding: number; reachableParents: number }>();
  for (const f of fees) {
    const k = f.student.classId ?? "unassigned";
    if (!byClass.has(k)) byClass.set(k, { name: k, debtorStudents: new Set(), outstanding: 0, reachableParents: 0 });
    const x = byClass.get(k)!;
    x.debtorStudents.add(f.studentId);
    x.outstanding += Number(f.balance);
  }
  // Reach: parents-with-email count is per-student, but with set semantics we
  // tally once per student even if they appear in many fee rows.
  const studentParentEmails = new Map<string, number>();
  for (const f of fees) {
    if (studentParentEmails.has(f.studentId)) continue;
    studentParentEmails.set(f.studentId, f.student.parentLinks.filter(l => Boolean(l.parent.user.email)).length);
  }
  for (const [classKey, info] of byClass) {
    info.reachableParents = Array.from(info.debtorStudents).reduce((sum, sid) => sum + (studentParentEmails.get(sid) ?? 0), 0);
  }

  // Look up nice class labels
  const classLabel = new Map<string, string>();
  for (const c of classes) classLabel.set(c.id, `${c.name}${c.arm}`);

  const overallDebtors = new Set(fees.map(f => f.studentId)).size;
  const overallOutstanding = fees.reduce((s, f) => s + Number(f.balance), 0);
  const overallReach = Array.from(studentParentEmails.values()).reduce((a, b) => a + b, 0);

  return (
    <PortalShell role="accountant">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/accountant" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
            <Send className="h-3.5 w-3.5" /> Reminders
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Send fee reminders</h1>
          <p className="text-sm text-slate-500">Bell + email every parent whose child still owes for this term.</p>
        </div>
      </div>

      {searchParams.sent && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {decodeURIComponent(searchParams.sent)}
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {!term ? (
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No active term — nothing to remind about.</p>
        </CardBody></Card>
      ) : overallDebtors === 0 ? (
        <Card><CardBody className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300 mb-3" />
          <p className="font-medium text-slate-700">Everyone's paid up — no reminders needed.</p>
        </CardBody></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <StatCard label="Debtors (term)" value={overallDebtors} icon={<Users className="h-5 w-5" />} accent="rose" />
            <StatCard label="Total outstanding" value={nairaFmt.format(overallOutstanding)} accent="amber" />
            <StatCard label="Reachable parents" value={overallReach} hint="have email on file" accent="emerald" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle>Per-class preview</CardTitle></CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {Array.from(byClass.entries())
                    .map(([k, v]) => ({ classId: k, label: classLabel.get(k) ?? "Unassigned", ...v }))
                    .sort((a, b) => b.outstanding - a.outstanding)
                    .map(c => (
                      <div key={c.classId} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-brand-900">{c.label}</p>
                          <p className="text-[11px] text-slate-500">
                            {c.debtorStudents.size} debtor{c.debtorStudents.size === 1 ? "" : "s"} · {c.reachableParents} reachable parent{c.reachableParents === 1 ? "" : "s"}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-rose-700">{nairaFmt.format(c.outstanding)}</p>
                      </div>
                    ))}
                </div>
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Compose blast</CardTitle></CardHeader>
              <CardBody>
                <form action={sendFeeReminders} className="space-y-4">
                  <div>
                    <Label>Scope</Label>
                    <Select name="classId" defaultValue={searchParams.class ?? ""}>
                      <option value="">All classes ({overallDebtors} debtor{overallDebtors === 1 ? "" : "s"})</option>
                      {Array.from(byClass.entries())
                        .map(([k, v]) => ({ classId: k, label: classLabel.get(k) ?? "Unassigned", debtors: v.debtorStudents.size }))
                        .sort((a, b) => b.debtors - a.debtors)
                        .map(c => (
                          <option key={c.classId} value={c.classId}>{c.label} — {c.debtors} debtor{c.debtors === 1 ? "" : "s"}</option>
                        ))}
                    </Select>
                  </div>

                  <div>
                    <Label>Custom message (optional)</Label>
                    <Textarea
                      name="customMessage"
                      rows={5}
                      placeholder="Add a personal note. e.g. 'Please clear before the end of next week so your child can sit for the test.' Leave blank for the default reminder copy."
                      maxLength={2000}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      The default email already shows the child's name, class, balance, and a payment link. Use this only when you want extra context.
                    </p>
                  </div>

                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    <strong>Heads up.</strong> Reminders go to <em>every</em> linked parent with an email. There's no undo. Double-check the scope.
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="gold"><Send className="h-4 w-4" /> Send reminders</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </PortalShell>
  );
}
