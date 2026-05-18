import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Users, Search, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function AdminStudentsPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN", "DIRECTOR"]);

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      classRef: { select: { name: true, arm: true } },
    },
    take: 200,
  });

  const totalByLevel = students.reduce(
    (acc, s) => {
      const lvl = s.classRef?.name?.startsWith("JSS") ? "jss" : s.classRef?.name?.startsWith("SS") ? "sss" : "unassigned";
      acc[lvl] = (acc[lvl] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Students</h1>
          <p className="text-sm text-slate-500">{students.length} enrolled · JSS {totalByLevel.jss ?? 0} · SS {totalByLevel.sss ?? 0}</p>
        </div>
        <Link href="/portal/admin/students/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> Add Student
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All students</CardTitle>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Search className="h-4 w-4" />
            <span className="text-xs">Search coming soon</span>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {students.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No students yet</p>
              <p className="text-sm text-slate-500 mt-1">Use the "Add Student" button to register the first one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Admission #</th>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Class</th>
                    <th className="text-left px-4 py-2.5 font-medium">Gender</th>
                    <th className="text-left px-4 py-2.5 font-medium">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[12px] text-brand-700">{s.admissionNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{s.user.name}</td>
                      <td className="px-4 py-2.5">
                        {s.classRef ? (
                          <Badge tone="neutral">{s.classRef.name}{s.classRef.arm}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">{s.gender ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">{s.user.email}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(s.createdAt)}</td>
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
