import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import { createFeeStructure, applyFeeStructure, deleteFeeStructure } from "./actions";
import { Receipt, Plus, CheckCircle2, AlertCircle, Trash2, Wallet, Send, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

type SearchParams = { created?: string; applied?: string; error?: string };

export default async function FeeStructuresPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const { term, session } = await getActiveContext();

  const [structures, classes] = await Promise.all([
    prisma.feeStructure.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/fees" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Fee Structures</h1>
          <p className="text-sm text-slate-500">Define a full breakdown once (tuition, books, levies, etc.) and apply it to a class in one click.</p>
        </div>
      </div>

      {searchParams.created && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Structure "{decodeURIComponent(searchParams.created)}" saved.</div>
      )}
      {searchParams.applied && (() => {
        const [c, u] = decodeURIComponent(searchParams.applied).split("+");
        return <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Applied to class — {c} new fee row(s), {u} updated.</div>;
      })()}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Build new structure */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle><Plus className="h-4 w-4 inline mr-1" /> Build a new structure</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createFeeStructure} className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label>Structure name *</Label><Input name="name" required placeholder="e.g. JSS Term 1 2026/2027" /></div>
                <div>
                  <Label>Applies to (level)</Label>
                  <Select name="level" defaultValue="">
                    <option value="">Any level</option>
                    <option value="JSS">Junior Secondary</option>
                    <option value="SSS">Senior Secondary</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Line items *</Label>
                <p className="text-[11px] text-slate-500 mb-2">Add each fee component the parent will see — tuition, books, levies, lab, etc.</p>
                <div className="space-y-2" id="lineItems">
                  {[
                    { t: "Tuition Fee",       a: 350000 },
                    { t: "Books & Materials", a: 45000 },
                    { t: "PTA Levy",          a: 15000 },
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-[1fr_180px_auto] gap-2 items-center">
                      <Input name="feeType" defaultValue={row.t} placeholder="Fee item (e.g. Tuition)" required />
                      <Input name="amount" type="number" min={0} step="500" defaultValue={row.a} placeholder="Amount ₦" required />
                      <span className="text-[11px] text-slate-400">Row {i + 1}</span>
                    </div>
                  ))}
                  {/* Spare rows — admin fills as many as they need */}
                  {[0, 1, 2, 3].map(i => (
                    <div key={`extra-${i}`} className="grid grid-cols-[1fr_180px_auto] gap-2 items-center">
                      <Input name="feeType" placeholder="Additional item (optional)" />
                      <Input name="amount" type="number" min={0} step="500" placeholder="Amount ₦" />
                      <span className="text-[11px] text-slate-400">+</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="gold"><Receipt className="h-4 w-4" /> Save structure</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Apply existing structure */}
        <Card>
          <CardHeader><CardTitle><Send className="h-4 w-4 inline mr-1" /> Apply to a class</CardTitle></CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              {term ? `Charges every student in the chosen class for ${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term.` : "Start a term first."}
            </p>
            <form action={applyFeeStructure} className="space-y-3 text-sm">
              <div>
                <Label>Structure *</Label>
                <Select name="structureId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Class *</Label>
                <Select name="classId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
                </Select>
              </div>
              <div><Label>Due date</Label><Input name="dueDate" type="date" /></div>
              <Button type="submit" variant="gold" className="w-full" disabled={!term}><Send className="h-4 w-4" /> Apply now</Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved structures ({structures.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {structures.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No structures yet — build one above.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {structures.map(s => {
                const items = (s.items as unknown as { feeType: string; amount: number }[]);
                const total = items.reduce((acc, x) => acc + Number(x.amount), 0);
                return (
                  <div key={s.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-brand-900">{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {s.level && <Badge tone="info">{s.level}</Badge>}
                          <Badge tone="neutral">{items.length} items</Badge>
                          <span className="text-xs text-slate-500"><Wallet className="h-3 w-3 inline mr-0.5" /> Total: <strong className="text-brand-900">{nairaFmt.format(total)}</strong></span>
                        </div>
                      </div>
                      <form action={deleteFeeStructure}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="outline" className="text-xs text-rose-700 hover:bg-rose-50"><Trash2 className="h-3 w-3" /> Delete</Button>
                      </form>
                    </div>
                    <div className="mt-3 grid sm:grid-cols-2 gap-x-6 text-sm">
                      {items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-700">{it.feeType}</span>
                          <span className="font-medium text-slate-900 tabular-nums">{nairaFmt.format(Number(it.amount))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
