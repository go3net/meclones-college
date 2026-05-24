import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updateDisciplinaryCase, resolveDisciplinaryCase } from "../../../discipline/actions";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { ArrowLeft, AlertCircle, CheckCircle2, Shield, Save, Gavel, User as UserIcon, Calendar, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type Props = { params: { id: string }; searchParams: { saved?: string; resolved?: string; error?: string; created?: string } };

export default async function AdminDisciplineDetail({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const c = await prisma.disciplinaryCase.findUnique({
    where: { id: params.id },
    include: {
      student: {
        include: {
          user: { select: { name: true, image: true } },
          classRef: true,
          parentLinks: { include: { parent: { include: { user: { select: { name: true } } } } } },
        },
      },
      resolvedBy: { select: { name: true } },
    },
  });
  if (!c) notFound();

  const isResolved = c.status === "RESOLVED";

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link href="/portal/admin/discipline" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <Shield className="h-5 w-5 text-rose-600" />
        <h1 className="text-2xl font-bold text-brand-900 flex-1">Disciplinary case</h1>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        <Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge>
      </div>

      {(searchParams.created || searchParams.saved || searchParams.resolved) && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {searchParams.created && "Case filed and parents notified."}
          {searchParams.saved && "Changes saved."}
          {searchParams.resolved && "Case marked as resolved."}
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle><UserIcon className="h-4 w-4 inline mr-1" /> Student & incident</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-3">
            <div className="flex items-start gap-3">
              {(() => {
                const photo = c.student.photoUrl ?? c.student.user.image ?? null;
                const initials = c.student.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-rose-200 bg-brand-100 text-brand-700 flex items-center justify-center font-bold shrink-0">
                    {photo ? <img src={photo} alt={c.student.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                  </div>
                );
              })()}
              <div>
                <Link href={`/portal/admin/students/${c.student.id}`} className="font-semibold text-brand-900 hover:underline">{c.student.user.name}</Link>
                <p className="text-xs text-slate-500 font-mono">{c.student.admissionNumber} · {c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned"}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-slate-700"><Calendar className="h-4 w-4 text-slate-400" /> {dateFmt.format(c.incidentDate)}</div>
              {c.location && <div className="flex items-center gap-2 text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {c.location}</div>}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Description</p>
              <p className="whitespace-pre-wrap text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3">{c.description}</p>
            </div>
            {c.sanctionDetails && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Sanction details</p>
                <p className="whitespace-pre-wrap text-slate-800 bg-amber-50 border border-amber-200 rounded-lg p-3">{c.sanctionDetails}</p>
              </div>
            )}
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Filed by <strong className="text-slate-700">{c.reporterName}</strong>{c.reporterRole && <> ({c.reporterRole.toLowerCase()})</>} · {dateTimeFmt.format(c.createdAt)}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>At a glance</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-2">
            <Row label="Category">{CATEGORY_LABEL[c.category]}</Row>
            <Row label="Severity"><Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge></Row>
            <Row label="Sanction">{SANCTION_LABEL[c.sanction]}</Row>
            <Row label="Status"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></Row>
            <Row label="Parents linked">{c.student.parentLinks.length}</Row>
          </CardBody>
        </Card>
      </div>

      {/* Parent acknowledgement */}
      <Card className="mb-6">
        <CardHeader><CardTitle>Parent acknowledgement</CardTitle>{c.parentAcknowledged ? <Badge tone="success">Acknowledged</Badge> : <Badge tone="warning">Pending</Badge>}</CardHeader>
        <CardBody>
          {c.parentAcknowledged ? (
            <div className="space-y-2 text-sm">
              <p className="text-emerald-700"><CheckCircle2 className="h-4 w-4 inline mr-1" /> Acknowledged by <strong>{c.parentAckByName}</strong>{c.parentAcknowledgedAt && <> on {dateTimeFmt.format(c.parentAcknowledgedAt)}</>}.</p>
              {c.parentAckNote && (
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Parent's note</p>
                  <p className="whitespace-pre-wrap text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{c.parentAckNote}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No parent has acknowledged this case yet. The parent portal shows it as an action item; you can also call them directly:</p>
          )}
          {!c.parentAcknowledged && c.student.parentLinks.length > 0 && (
            <ul className="mt-3 text-sm space-y-1">
              {c.student.parentLinks.map(link => (
                <li key={link.id} className="text-slate-700">{link.parent.user.name} ({link.relation ?? "Parent"})</li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Edit / resolve forms */}
      {!isResolved && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Edit case</CardTitle></CardHeader>
            <CardBody>
              <form action={updateDisciplinaryCase} className="space-y-3 text-sm">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select name="category" defaultValue={c.category}>
                      {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select name="severity" defaultValue={c.severity}>
                      {Object.entries(SEVERITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                  <div>
                    <Label>Sanction</Label>
                    <Select name="sanction" defaultValue={c.sanction}>
                      {Object.entries(SANCTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select name="status" defaultValue={c.status}>
                    {Object.entries(STATUS_LABEL).filter(([v]) => v !== "RESOLVED").map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea name="description" rows={4} defaultValue={c.description} required minLength={5} />
                </div>
                <div>
                  <Label>Sanction details</Label>
                  <Textarea name="sanctionDetails" rows={2} defaultValue={c.sanctionDetails ?? ""} />
                </div>
                <Button type="submit" variant="outline" className="w-full"><Save className="h-4 w-4" /> Save changes</Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle><Gavel className="h-4 w-4 inline mr-1" /> Resolve case</CardTitle></CardHeader>
            <CardBody>
              <form action={resolveDisciplinaryCase} className="space-y-3 text-sm">
                <input type="hidden" name="id" value={c.id} />
                <div>
                  <Label>Resolution note *</Label>
                  <Textarea name="resolutionNote" rows={5} required minLength={3} placeholder="What was the outcome? Sanction served, counselling complete, parent meeting held, etc." />
                </div>
                <Button type="submit" variant="gold" className="w-full"><Gavel className="h-4 w-4" /> Mark resolved</Button>
                <p className="text-[11px] text-slate-500">Closes the case. Parents + the original reporter get a notification.</p>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {isResolved && (
        <Card>
          <CardHeader><CardTitle><Gavel className="h-4 w-4 inline mr-1" /> Resolution</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4 inline mr-1" /> Resolved by <strong>{c.resolvedBy?.name ?? "—"}</strong>{c.resolvedAt && <> on {dateTimeFmt.format(c.resolvedAt)}</>}.</p>
            {c.resolutionNote && <p className="mt-2 whitespace-pre-wrap text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">{c.resolutionNote}</p>}
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{children}</dd>
    </div>
  );
}
