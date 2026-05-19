import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button, Textarea, Label, Select } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { createStudentNote, deleteStudentNote } from "./actions";
import {
  ArrowLeft, Phone, Mail, User as UserIcon, Trophy, CalendarCheck,
  FileText, MessageSquarePlus, Trash2, AlertCircle, CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

const gradeColor: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  A1: "success", B2: "success", B3: "success",
  C4: "info", C5: "info", C6: "info",
  D7: "warning", E8: "warning",
  F9: "danger",
};

const categoryLabel: Record<string, string> = {
  ACADEMIC: "Academic",
  BEHAVIOUR: "Behaviour",
  ATTENDANCE: "Attendance",
  HEALTH: "Health",
  COMMENDATION: "Commendation",
  OTHER: "Other",
};

const categoryTone: Record<string, "info" | "warning" | "danger" | "success" | "neutral"> = {
  ACADEMIC: "info",
  BEHAVIOUR: "warning",
  ATTENDANCE: "warning",
  HEALTH: "danger",
  COMMENDATION: "success",
  OTHER: "neutral",
};

type Props = { params: { id: string }; searchParams: { noted?: string; error?: string } };

export default async function TeacherStudentDetailPage({ params, searchParams }: Props) {
  const teacher = await getCurrentTeacher();
  const { term, session } = await getActiveContext();

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true } },
      classRef: true,
      parentLinks: { include: { parent: { include: { user: { select: { name: true, email: true, phone: true } } } } } },
    },
  });
  if (!student) notFound();

  // Authorise: teacher must teach this student's class.
  const allowedClassIds = new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]);
  if (!student.classId || !allowedClassIds.has(student.classId)) {
    redirect("/portal/teacher/classes");
  }

  // Active term aggregates
  const [attendance, allTermResults, allHistoryResults, classmates, notes, awards] = await Promise.all([
    term ? prisma.attendance.findMany({
      where: { studentId: student.id, termId: term.id },
      orderBy: { date: "desc" },
      take: 90,
    }) : Promise.resolve([]),
    term ? prisma.result.findMany({
      where: { studentId: student.id, termId: term.id },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
    }) : Promise.resolve([]),
    prisma.result.findMany({
      where: { studentId: student.id, isPublished: true },
      include: { subject: { select: { name: true, code: true } }, term: { include: { session: true } } },
      orderBy: [{ term: { session: { name: "desc" } } }, { term: { name: "asc" } }, { subject: { name: "asc" } }],
      take: 100,
    }),
    student.classId ? prisma.student.count({ where: { classId: student.classId } }) : Promise.resolve(0),
    prisma.studentNote.findMany({
      where: { studentId: student.id, visibility: { in: ["STAFF_ONLY", "PARENT_VISIBLE"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.award.findMany({
      where: { studentId: student.id },
      orderBy: { awardedAt: "desc" },
      take: 8,
    }),
  ]);

  const attTotal = attendance.length;
  const attCounts = attendance.reduce((acc, r) => {
    if (r.status === "PRESENT") acc.present++;
    else if (r.status === "ABSENT") acc.absent++;
    else if (r.status === "LATE") acc.late++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });
  const attRate = attTotal > 0 ? Math.round((attCounts.present / attTotal) * 100) : 0;

  // Term performance
  const termTotal = allTermResults.reduce((s, r) => s + r.total, 0);
  const termAvg = allTermResults.length > 0 ? Math.round((termTotal / allTermResults.length) * 10) / 10 : 0;
  const termPosition = allTermResults.find(r => r.position !== null)?.position ?? null;

  // History grouped by term label.
  const historyByTerm = new Map<string, { label: string; rows: typeof allHistoryResults }>();
  for (const r of allHistoryResults) {
    const label = `${r.term.name.charAt(0)}${r.term.name.slice(1).toLowerCase()} Term ${r.term.session.name}`;
    if (!historyByTerm.has(label)) historyByTerm.set(label, { label, rows: [] });
    historyByTerm.get(label)!.rows.push(r);
  }
  const historyEntries = Array.from(historyByTerm.values()).slice(0, 6);

  const photoUrl = student.photoUrl ?? student.user.image ?? null;
  const initials = student.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  // Subjects this teacher teaches (highlighted in the term results view).
  const myTeacherSubjectIds = new Set(teacher.subjects.map(s => s.subject.id));

  return (
    <PortalShell role="teacher">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/portal/teacher/classes/${student.classId}`} className="text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-gold-200 bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl shrink-0">
            {photoUrl ? <img src={photoUrl} alt={student.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{student.user.name}</h1>
            <p className="text-sm text-slate-500 font-mono">
              {student.admissionNumber} · {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned"}
              {term && session && ` · ${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term ${session.name}`}
            </p>
          </div>
        </div>
      </div>

      {searchParams.noted && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Note added.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Avg this term" value={`${termAvg}%`} icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Position" value={termPosition ? `${termPosition}` : "—"} hint={classmates > 0 ? `of ${classmates}` : ""} icon={<Trophy className="h-5 w-5" />} accent="gold" />
        <StatCard label="Attendance" value={attTotal > 0 ? `${attRate}%` : "—"} hint={`${attTotal} days`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Awards" value={awards.length} icon={<Trophy className="h-5 w-5" />} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Profile */}
        <Card>
          <CardHeader><CardTitle><UserIcon className="h-4 w-4 inline mr-1" /> Profile</CardTitle></CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Gender</span><span>{student.gender ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">DOB</span><span>{student.dob ? dateFmt.format(student.dob) : "—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="truncate">{student.user.email}</span></div>
            {student.user.phone && <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{student.user.phone}</span></div>}
            {student.address && <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="text-right">{student.address}</span></div>}
          </CardBody>
        </Card>

        {/* Parents */}
        <Card>
          <CardHeader><CardTitle>Parents / Guardians</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            {student.parentLinks.length === 0 ? (
              <p className="text-slate-500">No parent linked. Ask the office to attach one.</p>
            ) : student.parentLinks.map(link => (
              <div key={link.id} className="pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                <p className="font-medium text-brand-900">{link.parent.user.name}</p>
                <p className="text-xs text-slate-500">{link.relation ?? "Parent"}</p>
                {link.parent.user.email && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1"><Mail className="h-3 w-3" /> {link.parent.user.email}</div>
                )}
                {link.parent.user.phone && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${link.parent.user.phone}`} className="hover:text-brand-700">{link.parent.user.phone}</a>
                    <a href={`https://wa.me/${link.parent.user.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer noopener" className="text-emerald-600 hover:text-emerald-700">WhatsApp</a>
                  </div>
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Awards */}
        <Card>
          <CardHeader><CardTitle>Awards</CardTitle><Badge tone="neutral">{awards.length}</Badge></CardHeader>
          <CardBody>
            {awards.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No awards yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {awards.map(a => (
                  <div key={a.id} className="border border-gold-200 bg-gold-50 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gold-700">
                      <span>{"★".repeat(a.stars)}{"☆".repeat(5 - a.stars)}</span>
                      <span className="uppercase tracking-wide font-semibold">{a.category.replace(/_/g, " ").toLowerCase()}</span>
                    </div>
                    <p className="font-semibold text-brand-900 mt-0.5 text-sm">{a.title}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Current term results */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{term ? `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term results` : "Current results"}</CardTitle>
          <Badge tone="neutral">{allTermResults.length} subjects</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {allTermResults.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No results entered yet for this term.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Subject</th>
                  <th className="text-right px-4 py-2 font-medium">CA1</th>
                  <th className="text-right px-4 py-2 font-medium">CA2</th>
                  <th className="text-right px-4 py-2 font-medium">Exam</th>
                  <th className="text-right px-4 py-2 font-medium">Total</th>
                  <th className="text-center px-4 py-2 font-medium">Grade</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {allTermResults.map(r => {
                  const mine = myTeacherSubjectIds.has(r.subjectId);
                  return (
                    <tr key={r.id} className={`border-t border-slate-100 ${mine ? "bg-gold-50/40" : ""}`}>
                      <td className="px-4 py-2">
                        <span className="font-medium text-slate-900">{r.subject.code}</span>
                        <span className="text-xs text-slate-500 ml-2">{r.subject.name}</span>
                        {mine && <span className="ml-2 text-[10px] uppercase tracking-wide text-gold-700 font-semibold">yours</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.ca1}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.ca2}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{r.exam}</td>
                      <td className="px-4 py-2 text-right font-semibold text-brand-900 tabular-nums">{r.total}</td>
                      <td className="px-4 py-2 text-center">
                        {r.grade ? <Badge tone={gradeColor[r.grade] ?? "neutral"}>{r.grade}</Badge> : "—"}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge tone={r.isPublished ? "success" : "warning"}>{r.isPublished ? "published" : "draft"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Past-term history */}
      {historyEntries.length > 1 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Past results history</CardTitle><Badge tone="neutral">{historyEntries.length} terms</Badge></CardHeader>
          <CardBody className="space-y-4">
            {historyEntries.map(entry => {
              const total = entry.rows.reduce((s, r) => s + r.total, 0);
              const avg = entry.rows.length > 0 ? Math.round((total / entry.rows.length) * 10) / 10 : 0;
              const pos = entry.rows.find(r => r.position !== null)?.position ?? null;
              return (
                <div key={entry.label}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-brand-900 text-sm">{entry.label}</p>
                    <div className="text-xs text-slate-500">Avg <strong className="text-brand-900">{avg}%</strong>{pos && <> · Position <strong className="text-brand-900">{pos}</strong></>}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.rows.map(r => (
                      <span key={r.id} className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs">
                        <strong className="text-slate-900">{r.subject.code}</strong>
                        <span className="text-slate-500">{r.total}</span>
                        {r.grade && <Badge tone={gradeColor[r.grade] ?? "neutral"}>{r.grade}</Badge>}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      )}

      {/* Notes — leave + view */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle><MessageSquarePlus className="h-4 w-4 inline mr-1" /> Leave a note</CardTitle></CardHeader>
          <CardBody>
            <form action={createStudentNote} className="space-y-3 text-sm">
              <input type="hidden" name="studentId" value={student.id} />
              <div>
                <Label>Category</Label>
                <Select name="category" defaultValue="OTHER">
                  <option value="ACADEMIC">Academic</option>
                  <option value="BEHAVIOUR">Behaviour</option>
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="HEALTH">Health</option>
                  <option value="COMMENDATION">Commendation</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div>
                <Label>Visibility</Label>
                <Select name="visibility" defaultValue="STAFF_ONLY">
                  <option value="STAFF_ONLY">Staff only</option>
                  <option value="PARENT_VISIBLE">Share with parent</option>
                  <option value="ADMIN_ONLY">Admin only (sensitive)</option>
                </Select>
              </div>
              <div>
                <Label>Note *</Label>
                <Textarea name="body" required minLength={3} rows={4} placeholder="What did you observe today?" />
              </div>
              <Button type="submit" variant="gold" className="w-full"><MessageSquarePlus className="h-4 w-4" /> Save note</Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Notes & observations</CardTitle><Badge tone="neutral">{notes.length}</Badge></CardHeader>
          <CardBody className="p-0">
            {notes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No notes yet. Leave the first one ↖</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone={categoryTone[n.category]}>{categoryLabel[n.category]}</Badge>
                        {n.visibility === "PARENT_VISIBLE" && <Badge tone="info">Shared w/ parent</Badge>}
                        {n.visibility === "ADMIN_ONLY" && <Badge tone="warning">Admin-only</Badge>}
                      </div>
                      <span className="text-[11px] text-slate-500">{dateTimeFmt.format(n.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-[11px] text-slate-500">— {n.authorName}{n.authorRole && <span className="text-slate-400"> · {n.authorRole.toLowerCase()}</span>}</p>
                      {n.authorId === teacher.userId && (
                        <form action={deleteStudentNote}>
                          <input type="hidden" name="id" value={n.id} />
                          <button type="submit" className="inline-flex items-center gap-1 text-[11px] text-rose-700 hover:bg-rose-50 px-2 py-0.5 rounded">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Attendance log */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance this term</CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone="success">{attCounts.present} P</Badge>
            <Badge tone="warning">{attCounts.late} L</Badge>
            <Badge tone="danger">{attCounts.absent} A</Badge>
          </div>
        </CardHeader>
        <CardBody>
          {attendance.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-6">No attendance recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {attendance.map(a => (
                <span
                  key={a.id}
                  title={`${dateFmt.format(a.date)} · ${a.status.toLowerCase()}`}
                  className={`h-7 w-7 rounded-md text-[10px] font-semibold flex items-center justify-center
                    ${a.status === "PRESENT" ? "bg-emerald-100 text-emerald-700" :
                      a.status === "LATE" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"}`}
                >
                  {a.status[0]}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
