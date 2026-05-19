import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createSubject } from "../actions";
import { ArrowLeft, AlertCircle, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function NewSubjectPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const teachers = await prisma.teacher.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/subjects" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">New Subject</h1>
          <p className="text-sm text-slate-500">Add a curriculum subject and assign teachers.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Subject details</CardTitle></CardHeader>
        <CardBody>
          <form action={createSubject} className="grid sm:grid-cols-2 gap-4">
            <div><Label>Name *</Label><Input name="name" required placeholder="e.g. Mathematics" /></div>
            <div><Label>Code *</Label><Input name="code" required maxLength={8} placeholder="e.g. MTH" pattern="[A-Z0-9]+" title="Uppercase letters and digits only" /></div>

            <div className="sm:col-span-2">
              <Label>Assign teachers</Label>
              <div className="border border-slate-200 rounded-lg p-3 max-h-64 overflow-auto">
                <div className="grid sm:grid-cols-2 gap-2">
                  {teachers.map(t => (
                    <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" name="teacherIds" value={t.id} className="rounded" />
                      <span>{t.user.name}</span>
                    </label>
                  ))}
                  {teachers.length === 0 && <p className="text-sm text-slate-500">No teachers yet.</p>}
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Link href="/portal/admin/subjects"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold"><BookOpen className="h-4 w-4" /> Create subject</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
