import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Textarea } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updateTeacher, deactivateTeacher } from "./actions";
import { ArrowLeft, AlertCircle, Save, UserX } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { error?: string } };

export default async function EditTeacherPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [teacher, subjects, classes] = await Promise.all([
    prisma.teacher.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true, image: true } },
        subjects: { select: { subjectId: true } },
        classes: { select: { classId: true } },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);
  if (!teacher) notFound();

  const linkedSubjects = new Set(teacher.subjects.map(s => s.subjectId));
  const linkedClasses = new Set(teacher.classes.map(c => c.classId));

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/teachers" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Edit Teacher</h1>
          <p className="text-sm text-slate-500">{teacher.user.name}</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Teacher details</CardTitle></CardHeader>
        <CardBody>
          <form action={updateTeacher} className="grid sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" value={teacher.id} />
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <PhotoUpload name="photoUrl" defaultUrl={teacher.user.image} alt={teacher.user.name} />
            </div>
            <div><Label>Full name *</Label><Input name="name" defaultValue={teacher.user.name} required /></div>
            <div><Label>Email *</Label><Input name="email" type="email" defaultValue={teacher.user.email} required /></div>
            <div><Label>Phone</Label><Input name="phone" defaultValue={teacher.user.phone ?? ""} /></div>
            <div className="sm:col-span-2"><Label>Bio / specialism</Label><Textarea name="bio" defaultValue={teacher.bio ?? ""} rows={2} /></div>

            <div>
              <Label>Subjects</Label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto space-y-1">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={linkedSubjects.has(s.id)} className="rounded" />
                    <span className="font-mono text-xs text-slate-500">{s.code}</span>
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Classes</Label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-auto space-y-1">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="classIds" value={c.id} defaultChecked={linkedClasses.has(c.id)} className="rounded" />
                    <span>{c.name}{c.arm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" name="isActive" defaultChecked={teacher.user.isActive} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-slate-700">Account active</label>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <form action={deactivateTeacher}>
                <input type="hidden" name="id" value={teacher.id} />
                <Button type="submit" variant="outline" className="text-rose-700 hover:bg-rose-50"><UserX className="h-4 w-4" /> Deactivate</Button>
              </form>
              <div className="flex items-center gap-2">
                <Link href="/portal/admin/teachers"><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save</Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
