import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updateStudent, deactivateStudent } from "./actions";
import { ArrowLeft, AlertCircle, Save, UserX } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

type Props = { params: { id: string }; searchParams: { error?: string } };

export default async function EditStudentPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [student, classes] = await Promise.all([
    prisma.student.findUnique({
      where: { id: params.id },
      include: { user: { select: { name: true, email: true, phone: true, isActive: true, image: true } } },
    }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);
  if (!student) notFound();

  const dobStr = student.dob ? new Date(student.dob).toISOString().slice(0, 10) : "";

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/portal/admin/students/${student.id}`} className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Edit Student</h1>
          <p className="text-sm text-slate-500">{student.user.name} · {student.admissionNumber}</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <Card>
        <CardHeader><CardTitle>Student details</CardTitle></CardHeader>
        <CardBody>
          <form action={updateStudent} className="grid sm:grid-cols-2 gap-4">
            <input type="hidden" name="id" value={student.id} />
            <div className="sm:col-span-2">
              <Label>Photo</Label>
              <PhotoUpload name="photoUrl" defaultUrl={student.photoUrl ?? student.user.image} alt={student.user.name} />
            </div>
            <div><Label>Full name *</Label><Input name="name" defaultValue={student.user.name} required /></div>
            <div><Label>Email *</Label><Input name="email" type="email" defaultValue={student.user.email} required /></div>
            <div><Label>Phone</Label><Input name="phone" defaultValue={student.user.phone ?? ""} /></div>
            <div>
              <Label>Class</Label>
              <Select name="classId" defaultValue={student.classId ?? ""}>
                <option value="">— Unassigned —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.arm}</option>)}
              </Select>
            </div>
            <div>
              <Label>Gender</Label>
              <Select name="gender" defaultValue={student.gender ?? ""}>
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </Select>
            </div>
            <div><Label>Date of birth</Label><Input name="dob" type="date" defaultValue={dobStr} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input name="address" defaultValue={student.address ?? ""} /></div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" name="isActive" defaultChecked={student.user.isActive} className="rounded" />
              <label htmlFor="isActive" className="text-sm text-slate-700">Account active (student can log in)</label>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <form action={deactivateStudent}>
                <input type="hidden" name="id" value={student.id} />
                <Button type="submit" variant="outline" className="text-rose-700 hover:bg-rose-50"><UserX className="h-4 w-4" /> Deactivate account</Button>
              </form>
              <div className="flex items-center gap-2">
                <Link href={`/portal/admin/students/${student.id}`}><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save changes</Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
