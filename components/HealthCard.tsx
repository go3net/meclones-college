import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { HeartPulse, Phone, Hospital, AlertTriangle, Pill, ShieldAlert, Apple } from "lucide-react";

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

export interface HealthRecordLite {
  bloodGroup: string;
  genotype: string;
  allergies: string | null;
  chronicConditions: string | null;
  currentMedications: string | null;
  immunisationNotes: string | null;
  dietaryRestrictions: string | null;
  heightCm: number | null;
  weightKg: number | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  preferredHospital: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  lastCheckup: Date | null;
  notes: string | null;
  updatedAt: Date;
  lastUpdatedBy: string | null;
}

interface Props {
  record: HealthRecordLite | null;
  /** Shown when no record exists. Defaults to a generic empty state. */
  emptyHint?: string;
  className?: string;
  /** Optional href for an "Edit" affordance — only render for admins. */
  editHref?: string;
}

/**
 * Read-only display of a student's HealthRecord. Used in teacher + parent
 * portals (and as a summary on admin student-detail). Renders a useful
 * empty state when no record exists yet.
 */
export function HealthCard({ record, emptyHint, className, editHref }: Props) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle><HeartPulse className="h-4 w-4 inline mr-1 text-rose-600" /> Health & medical</CardTitle>
        <div className="flex items-center gap-2">
          {record && record.bloodGroup !== "UNKNOWN" && (
            <Badge tone="danger">{bloodGroupLabel[record.bloodGroup]}</Badge>
          )}
          {record && record.genotype !== "UNKNOWN" && (
            <Badge tone="warning">{genotypeLabel[record.genotype]}</Badge>
          )}
          {editHref && <a href={editHref} className="text-xs font-medium text-brand-700 hover:underline">Edit</a>}
        </div>
      </CardHeader>
      <CardBody>
        {!record ? (
          <div className="text-center py-8">
            <HeartPulse className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-700">No health record on file</p>
            <p className="text-xs text-slate-500 mt-1">{emptyHint ?? "The school office hasn't captured this yet."}</p>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {/* Vitals row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Vital label="Blood group" value={bloodGroupLabel[record.bloodGroup]} />
              <Vital label="Genotype" value={genotypeLabel[record.genotype]} />
              <Vital label="Height" value={record.heightCm ? `${record.heightCm} cm` : "—"} />
              <Vital label="Weight" value={record.weightKg ? `${record.weightKg} kg` : "—"} />
            </div>

            {record.allergies && (
              <Block icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} label="Allergies" tone="rose">
                {record.allergies}
              </Block>
            )}
            {record.chronicConditions && (
              <Block icon={<ShieldAlert className="h-4 w-4 text-amber-600" />} label="Chronic conditions" tone="amber">
                {record.chronicConditions}
              </Block>
            )}
            {record.currentMedications && (
              <Block icon={<Pill className="h-4 w-4 text-sky-600" />} label="Current medications" tone="sky">
                {record.currentMedications}
              </Block>
            )}
            {record.immunisationNotes && (
              <Block label="Immunisation" tone="slate">{record.immunisationNotes}</Block>
            )}
            {record.dietaryRestrictions && (
              <Block icon={<Apple className="h-4 w-4 text-emerald-600" />} label="Dietary restrictions" tone="emerald">
                {record.dietaryRestrictions}
              </Block>
            )}

            {(record.emergencyContactName || record.emergencyContactPhone) && (
              <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Emergency contact
                </p>
                <p className="font-semibold text-brand-900">{record.emergencyContactName ?? "—"}</p>
                {record.emergencyContactRelation && (
                  <p className="text-xs text-slate-500">{record.emergencyContactRelation}</p>
                )}
                {record.emergencyContactPhone && (
                  <p className="text-sm mt-1 flex items-center gap-2 flex-wrap">
                    <a href={`tel:${record.emergencyContactPhone}`} className="text-brand-700 hover:underline">{record.emergencyContactPhone}</a>
                    <a
                      href={`https://wa.me/${record.emergencyContactPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-emerald-600 hover:text-emerald-700 text-xs"
                    >
                      WhatsApp
                    </a>
                  </p>
                )}
              </div>
            )}

            {(record.doctorName || record.preferredHospital || record.insuranceProvider) && (
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Hospital className="h-3.5 w-3.5" /> Family doctor & hospital
                </p>
                <dl className="space-y-1 text-sm">
                  {record.doctorName && <Row label="Doctor">{record.doctorName}{record.doctorPhone && <> · <a href={`tel:${record.doctorPhone}`} className="text-brand-700 hover:underline">{record.doctorPhone}</a></>}</Row>}
                  {record.preferredHospital && <Row label="Hospital">{record.preferredHospital}</Row>}
                  {record.insuranceProvider && <Row label="HMO">{record.insuranceProvider}{record.insurancePolicyNumber && <span className="text-xs text-slate-500"> · {record.insurancePolicyNumber}</span>}</Row>}
                </dl>
              </div>
            )}

            {record.notes && (
              <Block label="Notes" tone="slate">{record.notes}</Block>
            )}

            <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1">
              <span>
                {record.lastCheckup ? <>Last checkup: <strong className="text-slate-700">{dateFmt.format(record.lastCheckup)}</strong></> : "No checkup logged"}
              </span>
              <span>
                Updated {dateFmt.format(record.updatedAt)}{record.lastUpdatedBy && <> by {record.lastUpdatedBy}</>}
              </span>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Vital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-brand-900">{value}</p>
    </div>
  );
}

function Block({
  icon,
  label,
  tone,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  tone: "rose" | "amber" | "sky" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const toneClass = {
    rose: "border-rose-200 bg-rose-50",
    amber: "border-amber-200 bg-amber-50",
    sky: "border-sky-200 bg-sky-50",
    emerald: "border-emerald-200 bg-emerald-50",
    slate: "border-slate-200 bg-slate-50",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
        {icon}{label}
      </p>
      <p className="text-sm text-slate-800 whitespace-pre-wrap">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 flex-wrap">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900 text-right">{children}</dd>
    </div>
  );
}
