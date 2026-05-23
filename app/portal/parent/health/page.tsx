import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, Badge } from "@/components/ui";
import { HealthCard } from "@/components/HealthCard";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { HeartPulse, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentHealthPage() {
  const parent = await getCurrentParentWithChildren();
  const studentIds = parent.children.map(c => c.student.id);

  const records = studentIds.length === 0
    ? []
    : await prisma.healthRecord.findMany({ where: { studentId: { in: studentIds } } });

  const byStudent = new Map(records.map(r => [r.studentId, r]));

  return (
    <PortalShell role="parent">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 flex items-center gap-1">
            <HeartPulse className="h-3.5 w-3.5" /> Health & medical
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Your children's health records</h1>
          <p className="text-sm text-slate-500">
            Read-only view of what the school has on file. To update anything, contact the office.
          </p>
        </div>
      </div>

      {parent.children.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No children linked yet</p>
            <p className="text-sm text-slate-500 mt-1">Ask the office to link your child to your account.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {parent.children.map(link => {
            const s = link.student;
            const r = byStudent.get(s.id) ?? null;
            const photoUrl = s.photoUrl ?? s.user.image ?? null;
            const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

            return (
              <section key={s.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative h-10 w-10 rounded-full overflow-hidden ring-2 ring-rose-200 bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {photoUrl ? <img src={photoUrl} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-900 truncate">{s.user.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {s.admissionNumber}{s.classRef && <> · {s.classRef.name}{s.classRef.arm}</>}
                    </p>
                  </div>
                  {!r && <Badge tone="warning">No record</Badge>}
                </div>
                <HealthCard
                  record={r}
                  emptyHint="The school office hasn't added health info for this child yet. Visit the front desk to provide blood group, allergies and emergency contact."
                />
              </section>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
