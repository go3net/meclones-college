import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createClass } from "../actions";
import { ArrowLeft, AlertCircle, GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function NewClassPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [teachers, subjects] = await Promise.all([
    prisma.teacher.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/classes" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">New Class</h1>
          <p className="text-sm text-slate-500">Create a class arm and assign a form teacher + subjects.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Class details</CardTitle></CardHeader>
        <CardBody>
          <form action={createClass} className="grid sm:grid-cols-2 gap-4">
            <div><Label>Class name *</Label><Input name="name" placeholder="e.g. JSS 1" required /></div>
            <div><Label>Arm *</Label><Input name="arm" placeholder="e.g. A" required maxLength={4} /></div>
            <div>
              <Label>Level *</Label>
              <Select name="level" required defaultValue="JSS">
                <option value="JSS">Junior Secondary (JSS)</option>
                <option value="SSS">Senior Secondary (SSS)</option>
              </Select>
            </div>
            <div>
              <Label>Form teacher</Label>
              <Select name="classTeacherId" defaultValue="">
                <option value="">— Unassigned —</option>
                {teachers.map(t => (<option key={t.id} value={t.id}>{t.user.name}</option>))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Subjects taught in this class</Label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-64 overflow-auto">
                <div className="grid sm:grid-cols-2 gap-2">
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="subjectIds" value={s.id} className="rounded" />
                      <span className="font-mono text-xs text-slate-500">{s.code}</span>
                      <span>{s.name}</span>
                    </label>
                  ))}
                  {subjects.length === 0 && <p className="text-sm text-slate-500">No subjects yet — add some first.</p>}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Link href="/portal/admin/classes"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold"><GraduationCap className="h-4 w-4" /> Create class</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
