import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Textarea, Select } from "@/components/ui";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { prisma } from "@/lib/prisma";
import { getCurrentParentWithChildren } from "@/lib/auth-helpers";
import { startThreadAsParent } from "../../../messages/actions";
import { ArrowLeft, AlertCircle, Send } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string; student?: string };

export default async function NewParentMessagePage({ searchParams }: { searchParams: SearchParams }) {
  const parent = await getCurrentParentWithChildren();
  const children = parent.children.map(c => c.student);

  // Surface every teacher who teaches any of the parent's children's classes,
  // plus the form teacher of those classes.
  const classIds = Array.from(new Set(children.map(c => c.classId).filter((x): x is string => !!x)));
  const teachers = classIds.length > 0 ? await prisma.teacher.findMany({
    where: {
      OR: [
        { classTeacherOf: { some: { id: { in: classIds } } } },
        { classes: { some: { classId: { in: classIds } } } },
      ],
    },
    include: {
      user: { select: { name: true, email: true, image: true } },
      classTeacherOf: { select: { id: true, name: true, arm: true } },
      subjects: { include: { subject: { select: { code: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  }) : [];

  return (
    <PortalShell role="parent">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/parent/messages" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">New message</h1>
          <p className="text-sm text-slate-500">Reach a teacher of your child's class.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Compose</CardTitle></CardHeader>
        <CardBody>
          <form action={startThreadAsParent} className="space-y-4">
            <div>
              <Label>Teacher *</Label>
              <Select name="teacherId" required defaultValue="">
                <option value="" disabled>Select a teacher…</option>
                {teachers.map(t => {
                  const subjects = t.subjects.map(s => s.subject.code).join(", ");
                  const formOf = t.classTeacherOf.map(c => `${c.name}${c.arm}`).join(", ");
                  return (
                    <option key={t.id} value={t.id}>
                      {t.user.name}{formOf && ` — form teacher ${formOf}`}{subjects && ` (${subjects})`}
                    </option>
                  );
                })}
                {teachers.length === 0 && <option disabled value="">No teachers found for your children's classes</option>}
              </Select>
            </div>

            {children.length > 0 && (
              <div>
                <Label>About which child? (optional)</Label>
                <Select name="studentId" defaultValue={searchParams.student ?? ""}>
                  <option value="">— Not specific —</option>
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.user.name}{c.classRef && ` (${c.classRef.name}${c.classRef.arm})`}</option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label>Subject *</Label>
              <Input name="subject" required minLength={2} placeholder="e.g. Following up on this term's results" />
            </div>

            <div>
              <Label>Message *</Label>
              <Textarea name="body" required minLength={2} rows={6} placeholder="Write your message…" />
            </div>

            <div>
              <Label>Attachment</Label>
              <AttachmentPicker namePrefix="attachment" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/portal/parent/messages"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold" disabled={teachers.length === 0}><Send className="h-4 w-4" /> Send message</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
