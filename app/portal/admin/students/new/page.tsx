import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createStudent } from "./actions";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const classes = await prisma.class.findMany({
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });

  return (
    <PortalShell role="school_admin">
      <Link href="/portal/admin/students" className="inline-flex items-center gap-1 text-sm text-brand-700 mb-4 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Add Student</h1>
        <p className="text-sm text-slate-500">Register a new student and optionally create their parent/guardian account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student & guardian details</CardTitle>
          <UserPlus className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody>
          <form action={createStudent} className="space-y-5">
            <fieldset className="space-y-4">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student</legend>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Photo</label>
                <PhotoUpload name="photoUrl" alt="New student" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">First name *</label>
                  <input name="firstName" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Last name *</label>
                  <input name="lastName" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Date of birth</label>
                  <input type="date" name="dob" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gender</label>
                  <select name="gender" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Class *</label>
                  <select name="classId" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="">Select class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">Admission number is auto-generated based on class + arm.</p>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4 pt-4 border-t border-slate-100">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent / Guardian (optional)</legend>
              <p className="text-[12px] text-slate-500 -mt-2">Fill in to also create a parent portal account and link it to this student.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parent full name</label>
                  <input name="parentName" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parent email</label>
                  <input type="email" name="parentEmail" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parent phone</label>
                  <input name="parentPhone" placeholder="+234..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </div>
              </div>
            </fieldset>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">Default password for new accounts: <code className="bg-slate-100 px-1 rounded">Meclones123!</code></p>
              <button type="submit" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
                <UserPlus className="h-4 w-4" /> Register student
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
