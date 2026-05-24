import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Textarea, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createDisciplinaryCase } from "../../../discipline/actions";
import { CATEGORY_LABEL, SEVERITY_LABEL, SANCTION_LABEL } from "@/lib/discipline";
import { ArrowLeft, AlertCircle, Send } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminNewDisciplineCase({ searchParams }: { searchParams: { student?: string; error?: string } }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const students = await prisma.student.findMany({
    where: { graduatedAt: null },
    include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
    orderBy: [{ classRef: { name: "asc" } }, { user: { name: "asc" } }],
    take: 1000,
  });

  // Group by class for the picker.
  const byClass = new Map<string, typeof students>();
  for (const s of students) {
    const k = s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "Unassigned";
    if (!byClass.has(k)) byClass.set(k, []);
    byClass.get(k)!.push(s);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/discipline" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Report disciplinary incident</h1>
          <p className="text-sm text-slate-500">Captures a formal record. The parent gets a notification.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Incident details</CardTitle></CardHeader>
        <CardBody>
          <form action={createDisciplinaryCase} className="space-y-4">
            <div>
              <Label>Student *</Label>
              <Select name="studentId" required defaultValue={searchParams.student ?? ""}>
                <option value="" disabled>Select a student…</option>
                {Array.from(byClass.entries()).map(([cls, group]) => (
                  <optgroup key={cls} label={cls}>
                    {group.map(s => <option key={s.id} value={s.id}>{s.user.name} · {s.admissionNumber}</option>)}
                  </optgroup>
                ))}
              </Select>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Incident date *</Label>
                <Input type="date" name="incidentDate" required defaultValue={today} />
              </div>
              <div>
                <Label>Location</Label>
                <Input name="location" placeholder="e.g. Classroom JSS 2A, school field" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Category *</Label>
                <Select name="category" defaultValue="OTHER">
                  {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label>Severity *</Label>
                <Select name="severity" defaultValue="MINOR">
                  {Object.entries(SEVERITY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label>Sanction *</Label>
                <Select name="sanction" defaultValue="NONE">
                  {Object.entries(SANCTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
            </div>

            <div>
              <Label>What happened? *</Label>
              <Textarea name="description" required minLength={5} rows={5} placeholder="Describe the incident factually — who, what, when, where, witnesses." />
            </div>

            <div>
              <Label>Sanction details</Label>
              <Textarea name="sanctionDetails" rows={3} placeholder="Dates, conditions, instructions to the student / parent." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/portal/admin/discipline"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold"><Send className="h-4 w-4" /> File case</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
