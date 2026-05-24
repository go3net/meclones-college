import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { HealthCard } from "@/components/HealthCard";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import {
  User, FileText, CalendarCheck, Wallet, Trophy, Mail, Phone, Home, ArrowLeft, Edit, HeartPulse, Shield,
} from "lucide-react";
import { CATEGORY_LABEL, SEVERITY_LABEL, SEVERITY_TONE, STATUS_LABEL, STATUS_TONE } from "@/lib/discipline";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const gradeColor: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  A1: "success", B2: "success", B3: "success",
  C4: "info", C5: "info", C6: "info",
  D7: "warning", E8: "warning",
  F9: "danger",
};

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"]);
  const { term, session } = await getActiveContext();

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true, image: true, createdAt: true } },
      classRef: true,
      parentLinks: {
        include: { parent: { include: { user: { select: { name: true, email: true, phone: true } } } } },
      },
      healthRecord: true,
    },
  });

  if (!student) notFound();

  // Pull results, attendance, fees for current term (if any).
  const [results, attendance, fees, disciplineCases] = await Promise.all([
    term ? prisma.result.findMany({
      where: { studentId: student.id, termId: term.id },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
    }) : Promise.resolve([]),
    term ? prisma.attendance.findMany({
      where: { studentId: student.id, termId: term.id },
      orderBy: { date: "desc" },
    }) : Promise.resolve([]),
    term ? prisma.fee.findMany({
      where: { studentId: student.id, termId: term.id },
      orderBy: { createdAt: "asc" },
    }) : Promise.resolve([]),
    prisma.disciplinaryCase.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // Stats
  const totalScore = results.reduce((s, r) => s + r.total, 0);
  const avg = results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0;
  const position = results.find(r => r.position !== null)?.position ?? null;
  const classSize = student.classId ? await prisma.student.count({ where: { classId: student.classId } }) : 0;

  const attCounts = attendance.reduce((acc, a) => {
    if (a.status === "PRESENT") acc.present++;
    else if (a.status === "ABSENT") acc.absent++;
    else if (a.status === "LATE") acc.late++;
    return acc;
  }, { present: 0, absent: 0, late: 0 });
  const attTotal = attCounts.present + attCounts.absent + attCounts.late;
  const attRate = attTotal > 0 ? Math.round((attCounts.present / attTotal) * 100) : 0;

  const feeTotals = fees.reduce(
    (acc, f) => ({
      billed: acc.billed + Number(f.amount),
      paid: acc.paid + Number(f.amountPaid),
      balance: acc.balance + Number(f.balance),
    }),
    { billed: 0, paid: 0, balance: 0 },
  );

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/portal/admin/students" className="text-slate-500 hover:text-brand-700">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {(() => {
            const photoUrl = student.photoUrl ?? student.user.image ?? null;
            const initials = student.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-gold-200 bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xl shrink-0">
                {photoUrl ? <img src={photoUrl} alt={student.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
              </div>
            );
          })()}
          <div>
            <h1 className="text-2xl font-bold text-brand-900">{student.user.name}</h1>
            <p className="text-sm text-slate-500 font-mono">
              {student.admissionNumber} · {student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned"}
              {term && session && ` · ${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term ${session.name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/portal/admin/discipline/new?student=${student.id}`} className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium px-4 py-2 rounded-lg border border-rose-200">
            <Shield className="h-4 w-4" /> Report
          </Link>
          <Link href={`/portal/admin/students/${student.id}/health`} className="inline-flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium px-4 py-2 rounded-lg border border-rose-200">
            <HeartPulse className="h-4 w-4" /> Health
          </Link>
          <Link href={`/portal/admin/students/${student.id}/edit`} className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Edit className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Personal */}
        <Card>
          <CardHeader>
            <CardTitle><User className="h-4 w-4 inline mr-1" /> Profile</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-sm">
            <div><span className="text-slate-500">Email:</span> {student.user.email}</div>
            {student.user.phone && <div><span className="text-slate-500">Phone:</span> {student.user.phone}</div>}
            <div><span className="text-slate-500">Gender:</span> {student.gender ?? "—"}</div>
            <div><span className="text-slate-500">DOB:</span> {student.dob ? dateFmt.format(student.dob) : "—"}</div>
            <div><span className="text-slate-500">Address:</span> {student.address ?? "—"}</div>
            <div><span className="text-slate-500">Joined:</span> {dateFmt.format(student.createdAt)}</div>
            <Badge tone={student.user.isActive ? "success" : "neutral"}>{student.user.isActive ? "Active" : "Inactive"}</Badge>
          </CardBody>
        </Card>

        {/* Parents */}
        <Card>
          <CardHeader>
            <CardTitle><Home className="h-4 w-4 inline mr-1" /> Parents / Guardians</CardTitle>
          </CardHeader>
          <CardBody>
            {student.parentLinks.length === 0 ? (
              <p className="text-sm text-slate-500">No parent linked.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {student.parentLinks.map(link => (
                  <li key={link.id}>
                    <p className="font-medium text-brand-900">{link.parent.user.name}</p>
                    <p className="text-xs text-slate-500">{link.relation ?? "Parent"}</p>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                      <Mail className="h-3 w-3" /> {link.parent.user.email}
                    </div>
                    {link.parent.user.phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Phone className="h-3 w-3" /> {link.parent.user.phone}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Term performance summary */}
        <Card>
          <CardHeader>
            <CardTitle><Trophy className="h-4 w-4 inline mr-1" /> Performance</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subjects scored</span><strong>{results.length}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Term average</span><strong>{avg}%</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Position</span><strong>{position ? `${position} / ${classSize}` : "—"}</strong></div>
            <div className="flex justify-between"><span className="text-slate-500">Attendance</span><strong>{attTotal > 0 ? `${attRate}%` : "—"}</strong></div>
          </CardBody>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Avg score" value={`${avg}%`} icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Position" value={position ? `${position}` : "—"} hint={classSize > 0 ? `of ${classSize}` : ""} icon={<Trophy className="h-5 w-5" />} accent="gold" />
        <StatCard label="Attendance" value={attTotal > 0 ? `${attRate}%` : "—"} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Fees outstanding" value={nairaFmt.format(feeTotals.balance)} icon={<Wallet className="h-5 w-5" />} accent={feeTotals.balance > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Results table */}
        <Card>
          <CardHeader><CardTitle>Results</CardTitle><Badge tone="neutral">{results.length}</Badge></CardHeader>
          <CardBody className="p-0">
            {results.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No results entered for this term.</div>
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
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">{r.subject.code}</td>
                      <td className="px-4 py-2 text-right">{r.ca1}</td>
                      <td className="px-4 py-2 text-right">{r.ca2}</td>
                      <td className="px-4 py-2 text-right">{r.exam}</td>
                      <td className="px-4 py-2 text-right font-semibold text-brand-900">{r.total}</td>
                      <td className="px-4 py-2 text-center">{r.grade ? <Badge tone={gradeColor[r.grade] ?? "neutral"}>{r.grade}</Badge> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Fees */}
        <Card>
          <CardHeader><CardTitle>Fees</CardTitle><Badge tone="neutral">{fees.length}</Badge></CardHeader>
          <CardBody className="p-0">
            {fees.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No fees charged this term.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Item</th>
                    <th className="text-right px-4 py-2 font-medium">Amount</th>
                    <th className="text-right px-4 py-2 font-medium">Paid</th>
                    <th className="text-right px-4 py-2 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(f => (
                    <tr key={f.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium text-slate-900">{f.feeType}</td>
                      <td className="px-4 py-2 text-right">{nairaFmt.format(Number(f.amount))}</td>
                      <td className="px-4 py-2 text-right text-emerald-700">{nairaFmt.format(Number(f.amountPaid))}</td>
                      <td className="px-4 py-2 text-right font-semibold">{nairaFmt.format(Number(f.balance))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 text-right">{nairaFmt.format(feeTotals.billed)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{nairaFmt.format(feeTotals.paid)}</td>
                    <td className="px-4 py-2 text-right">{nairaFmt.format(feeTotals.balance)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Health & medical */}
      <div className="mt-6">
        <HealthCard
          record={student.healthRecord}
          emptyHint="No health record on file yet — click the Health button above to capture one."
          editHref={`/portal/admin/students/${student.id}/health`}
        />
      </div>

      {/* Disciplinary cases */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle><Shield className="h-4 w-4 inline mr-1 text-rose-600" /> Disciplinary record</CardTitle>
          <Badge tone={disciplineCases.length === 0 ? "success" : "warning"}>{disciplineCases.length === 0 ? "Clean" : `${disciplineCases.length} case${disciplineCases.length === 1 ? "" : "s"}`}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {disciplineCases.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No disciplinary cases on file.</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-center px-4 py-2 font-medium">Severity</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-center px-4 py-2 font-medium">Ack</th>
                </tr>
              </thead>
              <tbody>
                {disciplineCases.map(c => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2"><Link href={`/portal/admin/discipline/${c.id}`} className="hover:underline">{dateFmt.format(c.incidentDate)}</Link></td>
                    <td className="px-4 py-2">{CATEGORY_LABEL[c.category]}</td>
                    <td className="px-4 py-2 text-center"><Badge tone={SEVERITY_TONE[c.severity]}>{SEVERITY_LABEL[c.severity]}</Badge></td>
                    <td className="px-4 py-2 text-center"><Badge tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</Badge></td>
                    <td className="px-4 py-2 text-center">{c.parentAcknowledged ? <Badge tone="success">Yes</Badge> : <span className="text-[11px] text-slate-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Attendance log */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Attendance log</CardTitle>
          <Badge tone="neutral">{attTotal} days</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {attendance.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No attendance records for this term yet.</div>
          ) : (
            <div className="flex flex-wrap gap-1 p-4">
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
