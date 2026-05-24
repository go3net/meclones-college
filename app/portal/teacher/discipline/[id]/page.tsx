import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/auth-helpers";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE, SANCTION_LABEL } from "@/lib/discipline";
import { ArrowLeft, Shield, CheckCircle2, Gavel, Calendar, MapPin, User as UserIcon } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function TeacherDisciplineDetail({ params }: { params: { id: string } }) {
  const teacher = await getCurrentTeacher();

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

  const allowedClassIds = new Set<string>([
    ...teacher.classTeacherOf.map(cl => cl.id),
    ...teacher.classes.map(cl => cl.classId),
  ]);
  const teaches = c.student.classId ? allowedClassIds.has(c.student.classId) : false;
  const filedByMe = c.reportedById === teacher.userId;
  if (!teaches && !filedByMe) redirect("/portal/teacher/discipline");

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <Link href="/portal/teacher/discipline" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <Shield className="h-5 w-5 text-rose-600" />
        <h1 className="text-2xl font-bold text-brand-900 flex-1">Disciplinary case</h1>
        <Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge>
        <Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle><UserIcon className="h-4 w-4 inline mr-1" /> Student</CardTitle></CardHeader>
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
              <Link href={`/portal/teacher/students/${c.student.id}`} className="font-semibold text-brand-900 hover:underline">{c.student.user.name}</Link>
              <p className="text-xs text-slate-500 font-mono">{c.student.admissionNumber} · {c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned"}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-slate-700"><Calendar className="h-4 w-4 text-slate-400" /> {dateFmt.format(c.incidentDate)}</div>
            {c.location && <div className="flex items-center gap-2 text-slate-700"><MapPin className="h-4 w-4 text-slate-400" /> {c.location}</div>}
          </div>
        </CardBody>
      </Card>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Pill label="Category" value={CATEGORY_LABEL[c.category]} />
        <Pill label="Sanction" value={SANCTION_LABEL[c.sanction]} />
        <Pill label="Filed by" value={`${c.reporterName}${c.reporterRole ? ` (${c.reporterRole.toLowerCase()})` : ""}`} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
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

      <Card className="mb-6">
        <CardHeader><CardTitle>Parent acknowledgement</CardTitle>{c.parentAcknowledged ? <Badge tone="success">Acknowledged</Badge> : <Badge tone="warning">Pending</Badge>}</CardHeader>
        <CardBody className="text-sm">
          {c.parentAcknowledged ? (
            <>
              <p className="text-emerald-700"><CheckCircle2 className="h-4 w-4 inline mr-1" /> Acknowledged by <strong>{c.parentAckByName}</strong>{c.parentAcknowledgedAt && <> on {dateTimeFmt.format(c.parentAcknowledgedAt)}</>}.</p>
              {c.parentAckNote && <p className="mt-2 whitespace-pre-wrap text-slate-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{c.parentAckNote}</p>}
            </>
          ) : (
            <p className="text-slate-600">No parent has acknowledged this case yet.</p>
          )}
        </CardBody>
      </Card>

      {c.status === "RESOLVED" && (
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

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-brand-900 text-sm">{value}</p>
    </div>
  );
}
