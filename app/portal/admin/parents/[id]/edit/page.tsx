import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updateParent, deactivateParent } from "./actions";
import { ArrowLeft, AlertCircle, Save, UserX } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { error?: string } };

export default async function EditParentPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [parent, students] = await Promise.all([
    prisma.parent.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true, phone: true, isActive: true, image: true } },
        children: { select: { studentId: true } },
      },
    }),
    prisma.student.findMany({
      orderBy: { admissionNumber: "asc" },
      include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
    }),
  ]);
  if (!parent) notFound();

  const linkedStudents = new Set(parent.children.map(c => c.studentId));

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/parents" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Edit Parent</h1>
          <p className="text-sm text-slate-500">{parent.user.name}</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Parent details</CardTitle></CardHeader>
        <CardBody>
          <form action={updateParent} className="grid sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" value={parent.id} />
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <PhotoUpload name="photoUrl" defaultUrl={parent.user.image} alt={parent.user.name} />
            </div>
            <div><Label>Full name *</Label><Input name="name" defaultValue={parent.user.name} required /></div>
            <div><Label>Email *</Label><Input name="email" type="email" defaultValue={parent.user.email} required /></div>
            <div><Label>Phone (WhatsApp)</Label><Input name="phone" defaultValue={parent.user.phone ?? ""} /></div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="optin" name="whatsappOptIn" defaultChecked={parent.whatsappOptIn} className="rounded" />
              <label htmlFor="optin" className="text-sm text-slate-700">WhatsApp opt-in</label>
            </div>

            <div className="sm:col-span-2">
              <Label>Linked children</Label>
              <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {students.map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" name="studentIds" value={s.id} defaultChecked={linkedStudents.has(s.id)} className="rounded" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-slate-900 text-sm">{s.user.name}</span>
                      <span className="block text-[11px] text-slate-500 font-mono">{s.admissionNumber}</span>
                    </span>
                    {s.classRef && <Badge tone="neutral">{s.classRef.name}{s.classRef.arm}</Badge>}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" name="isActive" defaultChecked={parent.user.isActive} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-slate-700">Account active</label>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <form action={deactivateParent}>
                <input type="hidden" name="id" value={parent.id} />
                <Button type="submit" variant="outline" className="text-rose-700 hover:bg-rose-50"><UserX className="h-4 w-4" /> Deactivate</Button>
              </form>
              <div className="flex items-center gap-2">
                <Link href="/portal/admin/parents"><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save</Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
