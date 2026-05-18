import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { GraduationCap, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function AdminTeachersPage() {
  await requireRole(["ADMIN", "SUPER_ADMIN", "DIRECTOR"]);

  const teachers = await prisma.teacher.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      subjects: { include: { subject: { select: { name: true, code: true } } } },
      classes: { include: { class: { select: { name: true, arm: true } } } },
      classTeacherOf: { select: { name: true, arm: true } },
    },
    take: 200,
  });

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Teachers</h1>
          <p className="text-sm text-slate-500">{teachers.length} faculty member{teachers.length === 1 ? "" : "s"}</p>
        </div>
        <Link href="/portal/admin/teachers/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> Add Teacher
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All teachers</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {teachers.length === 0 ? (
            <div className="py-16 text-center">
              <GraduationCap className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No teachers yet</p>
              <p className="text-sm text-slate-500 mt-1">Add the first faculty member to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Contact</th>
                    <th className="text-left px-4 py-2.5 font-medium">Subjects</th>
                    <th className="text-left px-4 py-2.5 font-medium">Classes</th>
                    <th className="text-left px-4 py-2.5 font-medium">Form teacher</th>
                    <th className="text-left px-4 py-2.5 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{t.user.name}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">
                        <div>{t.user.email}</div>
                        {t.user.phone && <div className="text-slate-400">{t.user.phone}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            t.subjects.map(s => (
                              <Badge key={s.subject.code} tone="info">{s.subject.code}</Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {t.classes.length === 0 ? (
                            <span className="text-xs text-slate-400">—</span>
                          ) : (
                            t.classes.map(c => (
                              <Badge key={c.class.name + c.class.arm} tone="neutral">{c.class.name}{c.class.arm}</Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {t.classTeacherOf.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <Badge tone="gold">{t.classTeacherOf.map(c => `${c.name}${c.arm}`).join(", ")}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(t.createdAt)}</td>
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
