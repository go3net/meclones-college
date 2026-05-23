import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Textarea, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { saveHealthRecord } from "./actions";
import {
  ArrowLeft, HeartPulse, AlertCircle, CheckCircle2, Phone, User as UserIcon, Hospital, Save,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const bloodGroupLabel: Record<string, string> = {
  A_POSITIVE: "A+", A_NEGATIVE: "A−",
  B_POSITIVE: "B+", B_NEGATIVE: "B−",
  AB_POSITIVE: "AB+", AB_NEGATIVE: "AB−",
  O_POSITIVE: "O+", O_NEGATIVE: "O−",
  UNKNOWN: "Unknown",
};

const genotypeLabel: Record<string, string> = {
  AA: "AA", AS: "AS", AC: "AC", SS: "SS", SC: "SC", CC: "CC", UNKNOWN: "Unknown",
};

type Props = { params: { id: string }; searchParams: { saved?: string; error?: string } };

export default async function StudentHealthPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, image: true } },
      classRef: true,
      healthRecord: true,
    },
  });
  if (!student) notFound();

  const r = student.healthRecord;
  const photoUrl = student.photoUrl ?? student.user.image ?? null;
  const initials = student.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  // Pre-format lastCheckup as yyyy-mm-dd for the date input.
  const lastCheckupValue = r?.lastCheckup ? r.lastCheckup.toISOString().slice(0, 10) : "";

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <Link href={`/portal/admin/students/${student.id}`} className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="relative h-14 w-14 rounded-full overflow-hidden ring-2 ring-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-lg shrink-0">
          {photoUrl ? <img src={photoUrl} alt={student.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
            <HeartPulse className="h-3.5 w-3.5" /> Health record
          </p>
          <h1 className="text-2xl font-bold text-brand-900">{student.user.name}</h1>
          <p className="text-sm text-slate-500 font-mono">
            {student.admissionNumber} · {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned"}
          </p>
        </div>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Health record saved.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs text-amber-800">
        <strong>Sensitive data.</strong> Health information is visible to the student's class teachers and linked parents (read-only).
        Every change is recorded in the audit log.
      </div>

      <form action={saveHealthRecord} className="space-y-6">
        <input type="hidden" name="studentId" value={student.id} />

        {/* Vitals */}
        <Card>
          <CardHeader><CardTitle><HeartPulse className="h-4 w-4 inline mr-1" /> Vitals & medical basics</CardTitle></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Blood group</Label>
                <Select name="bloodGroup" defaultValue={r?.bloodGroup ?? "UNKNOWN"}>
                  {Object.entries(bloodGroupLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label>Genotype</Label>
                <Select name="genotype" defaultValue={r?.genotype ?? "UNKNOWN"}>
                  {Object.entries(genotypeLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Height (cm)</Label>
                  <Input name="heightCm" type="number" step="0.1" min="0" defaultValue={r?.heightCm ?? ""} placeholder="e.g. 155" />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input name="weightKg" type="number" step="0.1" min="0" defaultValue={r?.weightKg ?? ""} placeholder="e.g. 48" />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>Last medical checkup</Label>
                <Input name="lastCheckup" type="date" defaultValue={lastCheckupValue} className="max-w-xs" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Conditions / allergies / meds */}
        <Card>
          <CardHeader><CardTitle>Allergies, conditions & medications</CardTitle></CardHeader>
          <CardBody>
            <div className="grid lg:grid-cols-2 gap-4">
              <div>
                <Label>Known allergies</Label>
                <Textarea name="allergies" rows={3} defaultValue={r?.allergies ?? ""} placeholder="e.g. Peanuts, penicillin, dust mites" />
              </div>
              <div>
                <Label>Chronic conditions</Label>
                <Textarea name="chronicConditions" rows={3} defaultValue={r?.chronicConditions ?? ""} placeholder="e.g. Asthma, sickle cell trait, epilepsy" />
              </div>
              <div>
                <Label>Current medications</Label>
                <Textarea name="currentMedications" rows={3} defaultValue={r?.currentMedications ?? ""} placeholder="Drug name · dose · frequency" />
              </div>
              <div>
                <Label>Immunisation notes</Label>
                <Textarea name="immunisationNotes" rows={3} defaultValue={r?.immunisationNotes ?? ""} placeholder="Vaccines received, dates, anything outstanding" />
              </div>
              <div className="lg:col-span-2">
                <Label>Dietary restrictions</Label>
                <Input name="dietaryRestrictions" defaultValue={r?.dietaryRestrictions ?? ""} placeholder="e.g. Lactose intolerant, vegetarian" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Emergency contact */}
        <Card>
          <CardHeader><CardTitle><Phone className="h-4 w-4 inline mr-1" /> Emergency contact</CardTitle></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Full name</Label>
                <Input name="emergencyContactName" defaultValue={r?.emergencyContactName ?? ""} placeholder="e.g. Mrs. Adeola Bello" />
              </div>
              <div>
                <Label>Phone number</Label>
                <Input name="emergencyContactPhone" defaultValue={r?.emergencyContactPhone ?? ""} placeholder="e.g. +234 803 000 0000" />
              </div>
              <div>
                <Label>Relation to student</Label>
                <Input name="emergencyContactRelation" defaultValue={r?.emergencyContactRelation ?? ""} placeholder="e.g. Aunt, Uncle, Family friend" />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Doctor + Hospital + Insurance */}
        <Card>
          <CardHeader><CardTitle><Hospital className="h-4 w-4 inline mr-1" /> Family doctor & hospital</CardTitle></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label>Family doctor</Label>
                <Input name="doctorName" defaultValue={r?.doctorName ?? ""} placeholder="Dr. ..." />
              </div>
              <div>
                <Label>Doctor's phone</Label>
                <Input name="doctorPhone" defaultValue={r?.doctorPhone ?? ""} />
              </div>
              <div>
                <Label>Preferred hospital</Label>
                <Input name="preferredHospital" defaultValue={r?.preferredHospital ?? ""} />
              </div>
              <div>
                <Label>HMO / insurance provider</Label>
                <Input name="insuranceProvider" defaultValue={r?.insuranceProvider ?? ""} />
              </div>
              <div>
                <Label>Policy number</Label>
                <Input name="insurancePolicyNumber" defaultValue={r?.insurancePolicyNumber ?? ""} />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Free notes */}
        <Card>
          <CardHeader><CardTitle>Other notes</CardTitle></CardHeader>
          <CardBody>
            <Textarea name="notes" rows={4} defaultValue={r?.notes ?? ""} placeholder="Anything else the school nurse / class teacher should know." />
          </CardBody>
        </Card>

        <div className="flex items-center justify-between flex-wrap gap-3 sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 -mx-4 px-4 py-3 sm:mx-0 sm:rounded-lg sm:border sm:shadow-md">
          <div className="text-xs text-slate-500">
            {r ? (
              <>Last updated {dateFmt.format(r.updatedAt)}{r.lastUpdatedBy && <> by <strong className="text-slate-700">{r.lastUpdatedBy}</strong></>}.</>
            ) : (
              <>No record on file yet — fill in what you have and save.</>
            )}
          </div>
          <div className="flex gap-2">
            <Link href={`/portal/admin/students/${student.id}`}><Button variant="ghost">Cancel</Button></Link>
            <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save health record</Button>
          </div>
        </div>
      </form>
    </PortalShell>
  );
}
