import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { acknowledgeDisciplinaryCase } from "../../../discipline/actions";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { ArrowLeft, Shield, CheckCircle2, AlertCircle, Gavel, Calendar, MapPin, User as UserIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type Props = { params: { id: string }; searchParams: { acknowledged?: string; error?: string } };

export default async function ParentDisciplineDetail({ params, searchParams }: Props) {
  const parent = await getCurrentParentWithChildren();
  const ownStudentIds = new Set(parent.children.map(c => c.student.id));

  const c = await prisma.disciplinaryCase.findUnique({
    where: { id: params.id },
    include: {
      student: {
        include: {
          user: { select: { name: true, image: true } },
          classRef: true,
        },
      },
      resolvedBy: { select: { name: true } },
    },
  });
  if (!c) notFound();
  if (!ownStudentIds.has(c.studentId)) redirect("/portal/parent/discipline");

  return (
    <PortalShell role="parent">
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link href="/portal/parent/discipline" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <Shield className="h-5 w-5 text-rose-600" />
        <h1 className="text-2xl font-bold text-brand-900 flex-1">Disciplinary case</h1>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        <Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge>
      </div>

      {searchParams.acknowledged && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Thank you. Your acknowledgement has been recorded.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle><UserIcon className="h-4 w-4 inline mr-1" /> Child</CardTitle></CardHeader>
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
              <p className="font-semibold text-brand-900">{c.student.user.name}</p>
              <p className="text-xs text-slate-500 font-mono">{c.student.admissionNumber} · {c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned"}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-700"><Calendar className="h-4 w-4 text-slate-400" /> {dateFmt.format(c.incidentDate)}</div>
            {c.location && <div className="flex items-center gap-2 text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {c.location}</div>}
          </div>
        </CardBody>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Pill label="Category" value={CATEGORY_LABEL[c.category]} />
        <Pill label="Sanction" value={SANCTION_LABEL[c.sanction]} />
        <Pill label="Filed by" value={c.reporterName} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>What happened</CardTitle></CardHeader>
        <CardBody>
          <p className="whitespace-pre-wrap text-slate-800 text-sm">{c.description}</p>
        </CardBody>
      </Card>

      {c.sanctionDetails && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Sanction details</CardTitle></CardHeader>
          <CardBody>
            <p className="whitespace-pre-wrap text-slate-800 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">{c.sanctionDetails}</p>
          </CardBody>
        </Card>
      )}

      {/* Acknowledgement */}
      {!c.parentAcknowledged ? (
        <Card className="mb-6 border-rose-200">
          <CardHeader><CardTitle><AlertCircle className="h-4 w-4 inline mr-1 text-rose-600" /> Acknowledge this case</CardTitle><Badge tone="warning">Action needed</Badge></CardHeader>
          <CardBody>
            <p className="text-sm text-slate-700 mb-4">
              Please confirm you've read this notice. You can add a note (optional) — perhaps a response, additional context, or a request to meet with the school.
            </p>
            <form action={acknowledgeDisciplinaryCase} className="space-y-3">
              <input type="hidden" name="id" value={c.id} />
              <div>
                <Label>Your note (optional)</Label>
                <Textarea name="note" rows={4} placeholder="Add anything you'd like the school to see…" />
              </div>
              <Button type="submit" variant="gold"><CheckCircle2 className="h-4 w-4" /> I acknowledge this case</Button>
            </form>
          </CardBody>
        </Card>
      ) : (
        <Card className="mb-6 border-emerald-200">
          <CardHeader><CardTitle><CheckCircle2 className="h-4 w-4 inline mr-1 text-emerald-600" /> You acknowledged</CardTitle><Badge tone="success">Done</Badge></CardHeader>
          <CardBody className="text-sm space-y-2">
            <p className="text-emerald-700">Acknowledged by <strong>{c.parentAckByName}</strong>{c.parentAcknowledgedAt && <> on {dateTimeFmt.format(c.parentAcknowledgedAt)}</>}.</p>
            {c.parentAckNote && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 whitespace-pre-wrap text-slate-800">{c.parentAckNote}</div>
            )}
          </CardBody>
        </Card>
      )}

      {c.status === "RESOLVED" && (
        <Card>
          <CardHeader><CardTitle><Gavel className="h-4 w-4 inline mr-1" /> Resolution</CardTitle></CardHeader>
          <CardBody>
            <p className="text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4 inline mr-1" /> Resolved by <strong>{c.resolvedBy?.name ?? "the school"}</strong>{c.resolvedAt && <> on {dateTimeFmt.format(c.resolvedAt)}</>}.</p>
            {c.resolutionNote && <p className="mt-2 whitespace-pre-wrap text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">{c.resolutionNote}</p>}
          </CardBody>
        </Card>
      )}
    </PortalShell>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-brand-900 text-sm">{value}</p>
    </div>
  );
}
