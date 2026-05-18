import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { Users, GraduationCap, ClipboardList, MessageCircle, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "neutral" | "success" | "warning" | "info"> = {
  SUBMITTED: "info",
  UNDER_REVIEW: "warning",
  EXAM_SCHEDULED: "warning",
  ADMITTED: "success",
  REJECTED: "neutral",
};

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function AdminDashboard() {
  // Pull live data. Each query is wrapped so a missing/empty table doesn't 500
  // the whole dashboard while we're still wiring things up.
  const safe = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
    try { return await promise; } catch (err) {
      console.error("[admin dashboard] query failed", err);
      return fallback;
    }
  };

  const [
    totalStudents,
    totalTeachers,
    admissionsCount,
    contactsCount,
    recentAdmissions,
    recentContacts,
  ] = await Promise.all([
    safe(prisma.student.count(), 0),
    safe(prisma.teacher.count(), 0),
    safe(prisma.admission.count(), 0),
    safe(prisma.contactMessage.count(), 0),
    safe(
      prisma.admission.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, reference: true, applicantName: true, classApplyingFor: true,
          parentName: true, parentPhone: true, status: true, createdAt: true,
        },
      }),
      [] as Awaited<ReturnType<typeof prisma.admission.findMany>>,
    ),
    safe(
      prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, email: true, role: true, message: true, createdAt: true },
      }),
      [] as Awaited<ReturnType<typeof prisma.contactMessage.findMany>>,
    ),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-600">Welcome back. Here's what's happening at Meclones College Lekki today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Students" value={totalStudents} hint="Active enrolment" icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Total Teachers" value={totalTeachers} hint="Teaching faculty" icon={<GraduationCap className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Admissions" value={admissionsCount} hint="All time applications" icon={<ClipboardList className="h-5 w-5" />} accent="gold" />
        <StatCard label="Enquiries" value={contactsCount} hint="Website contact form" icon={<MessageCircle className="h-5 w-5" />} accent="sky" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Admissions</CardTitle>
            <Link href="/portal/admin/applications" className="text-xs font-medium text-brand-700 hover:underline">View all →</Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentAdmissions.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No applications yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">Reference</th>
                      <th className="text-left px-4 py-2.5 font-medium">Applicant</th>
                      <th className="text-left px-4 py-2.5 font-medium">Class</th>
                      <th className="text-left px-4 py-2.5 font-medium">Parent</th>
                      <th className="text-left px-4 py-2.5 font-medium">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAdmissions.map(a => (
                      <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">{a.reference}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{a.applicantName}</td>
                        <td className="px-4 py-2.5 text-slate-700">{a.classApplyingFor}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          <div>{a.parentName}</div>
                          <div className="text-[11px] text-slate-500">{a.parentPhone}</div>
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

        <Card>
          <CardHeader>
            <CardTitle>Recent Enquiries</CardTitle>
            <Mail className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody className="space-y-4">
            {recentContacts.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No messages yet.</p>
            ) : (
              recentContacts.map(c => (
                <div key={c.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-brand-900 truncate">{c.name}</p>
                    <span className="text-[11px] text-slate-500 shrink-0">{dateFmt.format(c.createdAt)}</span>
                  </div>
                  <p className="text-[12px] text-slate-500">{c.role ?? c.email}</p>
                  <p className="mt-1 text-slate-600 line-clamp-2">{c.message}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
