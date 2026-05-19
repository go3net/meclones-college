import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createParent } from "./actions";
import { ArrowLeft, AlertCircle, UserPlus } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function NewParentPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const students = await prisma.student.findMany({
    orderBy: { admissionNumber: "asc" },
    include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
  });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/parents" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Add Parent</h1>
          <p className="text-sm text-slate-500">Create a parent account and link to one or more existing students.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Parent details</CardTitle></CardHeader>
        <CardBody>
          <form action={createParent} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <PhotoUpload name="photoUrl" alt="New parent" />
            </div>
            <div><Label>Full name *</Label><Input name="name" required minLength={2} /></div>
            <div><Label>Email *</Label><Input name="email" type="email" required /></div>
            <div><Label>Phone (WhatsApp)</Label><Input name="phone" placeholder="+234..." /></div>
            <div><Label>Initial password</Label><Input name="password" type="text" placeholder="Default: Meclones123!" /></div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="optin" name="whatsappOptIn" defaultChecked />
              <label htmlFor="optin" className="text-sm text-slate-700">Opt in to WhatsApp notifications</label>
            </div>

            <div className="sm:col-span-2">
              <Label>Link to students ({students.length} available)</Label>
              <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {students.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">No students in the database yet.</p>
                ) : (
                  students.map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" name="studentIds" value={s.id} className="rounded" />
                      <span className="flex-1 min-w-0">
                        <span className="font-medium text-slate-900 text-sm">{s.user.name}</span>
                        <span className="block text-[11px] text-slate-500 font-mono">{s.admissionNumber}</span>
                      </span>
                      {s.classRef && <Badge tone="neutral">{s.classRef.name}{s.classRef.arm}</Badge>}
                    </label>
                  ))
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Hold cmd/ctrl to select multiple. You can link more children later from the parent's profile.</p>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <Link href="/portal/admin/parents"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold"><UserPlus className="h-4 w-4" /> Create parent</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
