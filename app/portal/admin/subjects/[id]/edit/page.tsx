import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updateSubject } from "../../actions";
import { ArrowLeft, AlertCircle, Save } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { error?: string } };

export default async function EditSubjectPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [subject, teachers] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: params.id },
      include: { teachers: { select: { teacherId: true } } },
    }),
    prisma.teacher.findMany({ include: { user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  if (!subject) notFound();

  const linked = new Set(subject.teachers.map(t => t.teacherId));

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/subjects" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Edit Subject</h1>
          <p className="text-sm text-slate-500">{subject.name} · {subject.code}</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Subject details</CardTitle></CardHeader>
        <CardBody>
          <form action={updateSubject} className="grid sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" value={subject.id} />
            <div><Label>Name *</Label><Input name="name" defaultValue={subject.name} required /></div>
            <div><Label>Code *</Label><Input name="code" defaultValue={subject.code} required maxLength={8} pattern="[A-Z0-9]+" /></div>

            <div className="sm:col-span-2">
              <Label>Assign teachers</Label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-64 overflow-auto">
                <div className="grid sm:grid-cols-2 gap-2">
                  {teachers.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="teacherIds" value={t.id} defaultChecked={linked.has(t.id)} className="rounded" />
                      <span>{t.user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Link href="/portal/admin/subjects"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
