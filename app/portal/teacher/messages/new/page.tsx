import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Textarea, Select } from "@/components/ui";
import { AttachmentPicker } from "@/components/AttachmentPicker";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher } from "@/lib/auth-helpers";
import { startThreadAsTeacher } from "../../../messages/actions";
import { ArrowLeft, AlertCircle, Send } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string; student?: string; parent?: string };

export default async function NewTeacherMessagePage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await getCurrentTeacher();

  const allowedClassIds = Array.from(new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]));

  // Students of every class the teacher teaches, each with their linked
  // parents (so the form can offer parent + child pairs).
  const students = allowedClassIds.length === 0 ? [] : await prisma.student.findMany({
    where: { classId: { in: allowedClassIds }, graduatedAt: null },
    include: {
      user: { select: { name: true } },
      classRef: { select: { name: true, arm: true } },
      parentLinks: {
        include: { parent: { include: { user: { select: { name: true } } } } },
      },
    },
    orderBy: [{ classRef: { name: "asc" } }, { user: { name: "asc" } }],
  });

  // Flatten to (parent + student) recipient options.
  const recipients = students.flatMap(s =>
    s.parentLinks.map(link => ({
      key: `${link.parent.id}|${s.id}`,
      parentId: link.parent.id,
      studentId: s.id,
      parentName: link.parent.user.name,
      relation: link.relation ?? "Parent",
      studentName: s.user.name,
      className: s.classRef ? `${s.classRef.name}${s.classRef.arm}` : "Unassigned",
    })),
  );

  // Preselect from query if provided.
  const presetKey = searchParams.parent && searchParams.student
    ? `${searchParams.parent}|${searchParams.student}`
    : "";

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/teacher/messages" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">New message</h1>
          <p className="text-sm text-slate-500">Reach a parent about their child.</p>
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
          {recipients.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-700 font-medium">No parents to message yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Students in your classes either have no linked parent, or you haven't been assigned a class yet.
              </p>
            </div>
          ) : (
            <form action={startThreadAsTeacher} className="space-y-4">
              <RecipientPicker recipients={recipients} presetKey={presetKey} />

              <div>
                <Label>Subject *</Label>
                <Input name="subject" required minLength={2} placeholder="e.g. About this term's progress" />
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
                <Link href="/portal/teacher/messages"><Button variant="outline" type="button">Cancel</Button></Link>
                <Button type="submit" variant="gold"><Send className="h-4 w-4" /> Send message</Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}

/**
 * Single-select picker that surfaces parent+child pairs. The selected value
 * encodes `<parentId>|<studentId>`; the server action splits it.
 */
function RecipientPicker({
  recipients,
  presetKey,
}: {
  recipients: Array<{ key: string; parentId: string; studentId: string; parentName: string; relation: string; studentName: string; className: string }>;
  presetKey: string;
}) {
  const preset = recipients.find(r => r.key === presetKey);
  // Group by class for easier scanning when a teacher has many classes.
  const byClass = new Map<string, typeof recipients>();
  for (const r of recipients) {
    if (!byClass.has(r.className)) byClass.set(r.className, []);
    byClass.get(r.className)!.push(r);
  }
  return (
    <div>
      <Label>Send to *</Label>
      <Select name="recipientKey" required defaultValue={preset?.key ?? ""}>
        <option value="" disabled>Select a parent / child…</option>
        {Array.from(byClass.entries()).map(([className, group]) => (
          <optgroup key={className} label={className}>
            {group.map(r => (
              <option key={r.key} value={r.key}>
                {r.parentName} ({r.relation}) — about {r.studentName}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
      <p className="text-[11px] text-slate-500 mt-1">
        {recipients.length} parent{recipients.length === 1 ? "" : "s"} across {byClass.size} class{byClass.size === 1 ? "" : "es"} you teach.
      </p>
    </div>
  );
}
