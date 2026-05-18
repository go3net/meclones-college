import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ArrowLeft, UserPlus } from "lucide-react";
import { createTeacher } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewTeacherPage() {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [subjects, classes] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  return (
    <PortalShell role="school_admin">
      <Link href="/portal/admin/teachers" className="inline-flex items-center gap-1 text-sm text-brand-700 mb-4 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to teachers
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Add Teacher</h1>
        <p className="text-sm text-slate-500">Register a new teacher and assign them to subjects and classes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher details</CardTitle>
          <UserPlus className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody>
          <form action={createTeacher} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Full name *</label>
                <input name="name" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                <input type="email" name="email" required className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input name="phone" placeholder="+234..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Short bio</label>
                <textarea name="bio" rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <fieldset className="space-y-3 pt-2 border-t border-slate-100">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subjects</legend>
              <p className="text-[12px] text-slate-500">Pick every subject this teacher teaches. Hold ⌘/Ctrl to select multiple.</p>
              <select
                name="subjectIds"
                multiple
                size={Math.min(8, Math.max(4, subjects.length))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </fieldset>

            <fieldset className="space-y-3 pt-2 border-t border-slate-100">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Classes (subject-teacher assignments)</legend>
              <p className="text-[12px] text-slate-500">Pick classes where this teacher teaches their subject(s).</p>
              <select
                name="classIds"
                multiple
                size={Math.min(8, Math.max(4, classes.length))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
                ))}
              </select>
            </fieldset>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Form teacher of (optional)</label>
              <select name="formTeacherOf" defaultValue="" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">— none</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">A teacher can only be form teacher of one class.</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">Default password: <code className="bg-slate-100 px-1 rounded">Meclones123!</code></p>
              <button type="submit" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
                <UserPlus className="h-4 w-4" /> Register teacher
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
