import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, Textarea, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createKnowledgeSection, updateKnowledgeSection, toggleKnowledgeActive, deleteKnowledgeSection, seedDefaultKnowledge } from "./actions";
import {
  ArrowLeft, BookOpen, Plus, CheckCircle2, AlertCircle, Edit, ShieldOff, ShieldCheck, Trash2, Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type SearchParams = { added?: string; saved?: string; toggled?: string; deleted?: string; seeded?: string; error?: string };

export default async function KnowledgePage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const sections = await prisma.knowledgeSection.findMany({
    orderBy: { sortOrder: "asc" },
  });

  const active = sections.filter(s => s.isActive).length;
  const totalChars = sections.filter(s => s.isActive).reduce((s, x) => s + x.body.length, 0);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/admin" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Website chatbot
            </p>
            <h1 className="text-2xl font-bold text-brand-900">Knowledge base</h1>
            <p className="text-sm text-slate-500">
              Edit what the AI website assistant knows about your school. Active sections are stitched into the system prompt on every visitor question.
            </p>
          </div>
        </div>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Section <strong>{decodeURIComponent(searchParams.added)}</strong> created.
        </div>
      )}
      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved.
        </div>
      )}
      {searchParams.toggled && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Section status updated.
        </div>
      )}
      {searchParams.deleted && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Section deleted.
        </div>
      )}
      {searchParams.seeded && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Seeded {searchParams.seeded} default section{searchParams.seeded === "1" ? "" : "s"}.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Active sections" value={active} icon={<BookOpen className="h-5 w-5" />} accent="brand" />
        <StatCard label="Total sections" value={sections.length} accent="neutral" />
        <StatCard label="Chars in prompt" value={totalChars.toLocaleString()} hint="≈ 1 token per 4 chars" accent="emerald" />
      </div>

      {sections.length === 0 && (
        <Card className="mb-6 border-amber-200">
          <CardBody className="text-sm">
            <p className="text-slate-700 mb-3">
              <strong>No sections yet.</strong> Right now the chatbot is using its built-in default knowledge (the Meclones template). To make the bot answer with <em>your</em> school's information, either:
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={seedDefaultKnowledge}>
                <Button type="submit" variant="gold"><Sparkles className="h-4 w-4" /> Seed default sections</Button>
              </form>
              <p className="text-xs text-slate-500 mt-2 sm:mt-0 sm:self-center">
                — copies the Meclones template into the DB so you can edit each section.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle><Plus className="h-4 w-4 inline mr-1" /> Add a new section</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createKnowledgeSection} className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <Label>Key *</Label>
              <Input name="key" required minLength={2} maxLength={40} placeholder="e.g. boarding-fees" className="font-mono lowercase" />
              <p className="text-[11px] text-slate-500 mt-1">Slug-style id. Letters, numbers, _ or -.</p>
            </div>
            <div>
              <Label>Title *</Label>
              <Input name="title" required minLength={2} placeholder="e.g. Boarding house & fees" />
            </div>
            <div>
              <Label>Render order</Label>
              <Input name="sortOrder" type="number" min={0} max={1000} defaultValue="100" />
              <p className="text-[11px] text-slate-500 mt-1">Lower = earlier in the prompt.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Body (Markdown-ish) *</Label>
              <Textarea name="body" rows={4} required minLength={10} placeholder={"Boarding is available for SS 1–3 students. Termly boarding fee: ₦450,000…"} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="gold"><Plus className="h-4 w-4" /> Add section</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing sections</CardTitle>
          <Badge tone="neutral">{sections.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {sections.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No sections yet — start with the seed button above or add one manually.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sections.map(s => (
                <details key={s.id} className="px-4 py-3 group">
                  <summary className="cursor-pointer flex items-start gap-3 list-none">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-brand-900">{s.title}</span>
                        <Badge tone="neutral" className="font-mono text-[10px]">{s.key}</Badge>
                        {!s.isActive && <Badge tone="danger">Inactive</Badge>}
                        <span className="text-[10px] text-slate-500">order {s.sortOrder}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.body.slice(0, 200)}{s.body.length > 200 ? "…" : ""}</p>
                      <p className="text-[10px] text-slate-400 mt-1">Last updated {dateTimeFmt.format(s.updatedAt)}</p>
                    </div>
                    <Edit className="h-4 w-4 text-slate-400 group-open:rotate-90 transition-transform" />
                  </summary>

                  <form action={updateKnowledgeSection} className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50 grid sm:grid-cols-2 gap-3">
                    <input type="hidden" name="id" value={s.id} />
                    <div>
                      <Label>Title</Label>
                      <Input name="title" defaultValue={s.title} required minLength={2} />
                    </div>
                    <div>
                      <Label>Render order</Label>
                      <Input name="sortOrder" type="number" defaultValue={s.sortOrder} min={0} max={1000} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Body</Label>
                      <Textarea name="body" rows={8} defaultValue={s.body} required minLength={10} className="font-mono text-xs" />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-2 flex-wrap">
                      <Button type="submit" variant="outline" className="text-xs">Save</Button>
                      <form action={toggleKnowledgeActive} className="inline-flex">
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="outline" className="text-xs">
                          {s.isActive ? <><ShieldOff className="h-3 w-3" /> Deactivate</> : <><ShieldCheck className="h-3 w-3" /> Reactivate</>}
                        </Button>
                      </form>
                      <form action={deleteKnowledgeSection} className="inline-flex">
                        <input type="hidden" name="id" value={s.id} />
                        <Button type="submit" variant="outline" className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      </form>
                    </div>
                  </form>
                </details>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-slate-500 mt-4">
        💡 Tip: think of each section as a short FAQ-style answer. Keep it concise (the more sections, the more tokens per chatbot reply). The chatbot stitches every active section into its system prompt sorted by render order.
      </p>
    </PortalShell>
  );
}
