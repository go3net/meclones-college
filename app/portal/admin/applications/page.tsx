import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ClipboardList, Phone, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const statusTone: Record<string, "neutral" | "success" | "warning" | "info"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  EXAM_SCHEDULED: "warning",
  ADMITTED: "success",
  REJECTED: "neutral",
};

export default async function AdminApplicationsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN", "DIRECTOR"]);

  const [admissions, byStatus] = await Promise.all([
    prisma.admission.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.admission.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const counts = byStatus.reduce((acc, row) => {
    acc[row.status] = row._count.status;
    return acc;
  }, {} as Record<string, number>);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Admissions</h1>
        <p className="text-sm text-slate-500">All applications submitted via the public website.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          ["SUBMITTED", "Submitted"],
          ["UNDER_REVIEW", "Reviewing"],
          ["EXAM_SCHEDULED", "Exam"],
          ["ADMITTED", "Admitted"],
          ["REJECTED", "Rejected"],
        ].map(([key, label]) => (
          <Card key={key}>
            <CardBody className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-2xl font-bold text-brand-900">{counts[key] ?? 0}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application queue</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {admissions.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No applications yet</p>
              <p className="text-sm text-slate-500 mt-1">Applications submitted via /admission will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                    <th className="text-left px-4 py-2.5 font-medium">Applicant</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Parent / Guardian</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map(a => (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">{a.reference}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900">{a.applicantName}</div>
                        {a.previousSchool && <div className="text-[11px] text-slate-500">from {a.previousSchool}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{a.classApplyingFor}</td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-800 text-[13px]">{a.parentName}</div>
                        <div className="flex flex-col gap-0.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {a.parentPhone}</span>
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {a.parentEmail}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone[a.status] ?? "neutral"}>{a.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(a.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
