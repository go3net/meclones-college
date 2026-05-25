import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser, getActiveContext } from "@/lib/auth-helpers";
import { SCHOOL } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type Props = { params: { studentId: string }; searchParams: { termId?: string } };

const gradeColor: Record<string, string> = {
  A1: "bg-emerald-50 text-emerald-800", B2: "bg-emerald-50 text-emerald-800", B3: "bg-emerald-50 text-emerald-800",
  C4: "bg-sky-50 text-sky-800", C5: "bg-sky-50 text-sky-800", C6: "bg-sky-50 text-sky-800",
  D7: "bg-amber-50 text-amber-800", E8: "bg-amber-50 text-amber-800",
  F9: "bg-rose-50 text-rose-800",
};

/**
 * Print-friendly result slip. Accessible by:
 *  - Admin/Director/SuperAdmin: any student
 *  - Student: themselves only
 *  - Parent: only their linked children
 */
export default async function ResultSlipPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: {
      user: { select: { name: true, email: true } },
      classRef: true,
      parentLinks: { include: { parent: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!student) notFound();

  // Authorization check
  const role = user.role;
  if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(role)) {
    if (role === "STUDENT") {
      const me = await prisma.student.findUnique({ where: { userId: user.id } });
      if (me?.id !== student.id) redirect("/portal/me");
    } else if (role === "PARENT") {
      const me = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!me) redirect("/portal/me");
      const linked = await prisma.parentStudent.findFirst({ where: { parentId: me.id, studentId: student.id } });
      if (!linked) redirect("/portal/me");
    } else {
      redirect("/portal/me");
    }
  }

  // Determine which term to print: ?termId=... overrides; otherwise the active one.
  const { term: activeTerm, session: activeSession } = await getActiveContext();
  const term = searchParams.termId
    ? await prisma.term.findUnique({ where: { id: searchParams.termId }, include: { session: true } })
    : activeTerm ? await prisma.term.findUnique({ where: { id: activeTerm.id }, include: { session: true } }) : null;
  if (!term) notFound();

  const results = await prisma.result.findMany({
    where: { studentId: student.id, termId: term.id, isPublished: true },
    include: { subject: { select: { name: true, code: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  const [attendance, awards, termReport] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId: student.id, termId: term.id },
      select: { status: true },
    }),
    prisma.award.findMany({
      where: { studentId: student.id, OR: [{ termId: term.id }, { termId: null }] },
      orderBy: { awardedAt: "desc" },
      take: 8,
    }),
    prisma.studentTermReport.findUnique({
      where: { studentId_termId_sessionId: { studentId: student.id, termId: term.id, sessionId: term.sessionId } },
      select: {
        classTeacherComment: true, classTeacherByName: true,
        principalComment: true, principalByName: true,
      },
    }),
  ]);

  const totalAtt = attendance.length;
  const present = attendance.filter(a => a.status === "PRESENT").length;
  const absent = attendance.filter(a => a.status === "ABSENT").length;
  const late = attendance.filter(a => a.status === "LATE").length;
  const attRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : 0;

  const total = results.reduce((s, r) => s + r.total, 0);
  const avg = results.length > 0 ? Math.round((total / results.length) * 10) / 10 : 0;
  const position = results.find(r => r.position !== null)?.position ?? null;
  const classSize = student.classId ? await prisma.student.count({ where: { classId: student.classId } }) : 0;

  const termLabel = `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term`;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Top toolbar — hidden when printing */}
      <div className="no-print bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/portal/me" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" /> Back to portal
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={`/api/results/${student.id}/slip.pdf?termId=${term.id}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
            >
              Download PDF
            </a>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Result slip — A4 portrait */}
      <div className="max-w-4xl mx-auto bg-white shadow-card print:shadow-none print:max-w-none my-6 print:my-0 p-10 print:p-8">
        {/* School letterhead */}
        <div className="flex items-start justify-between border-b-2 border-brand-900 pb-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-brand-900">{SCHOOL.name}</h1>
            <p className="text-xs text-slate-600 mt-1">{SCHOOL.address}</p>
            <p className="text-xs text-slate-600">Tel: {SCHOOL.phone} · {SCHOOL.email}</p>
            <p className="text-xs text-gold-700 font-semibold mt-1">{SCHOOL.tagline}</p>
          </div>
          <div className="text-right">
            <div className="inline-block h-16 w-16 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center ring-2 ring-gold-400/30">
              <span className="text-gold-300 font-serif font-bold text-2xl leading-none">M</span>
            </div>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-brand-900 text-center mb-1">STUDENT REPORT CARD</h2>
        <p className="text-center text-sm text-slate-600 mb-6">{termLabel} · Session {term.session.name}</p>

        {/* Student info block */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{student.user.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Admission #</span><span className="font-mono text-slate-900">{student.admissionNumber}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Class</span><span className="font-medium text-slate-900">{student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Gender</span><span className="text-slate-900">{student.gender ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Date of birth</span><span className="text-slate-900">{student.dob ? dateFmt.format(student.dob) : "—"}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Parent</span><span className="text-slate-900">{student.parentLinks[0]?.parent.user.name ?? "—"}</span></div>
        </div>

        {/* Academic results table */}
        <h3 className="font-display text-lg font-bold text-brand-900 mb-2">Academic Performance</h3>
        <table className="w-full text-sm border border-slate-200 mb-6">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <th className="text-left px-3 py-2 border-b border-slate-200">Subject</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">CA1 (20)</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">CA2 (20)</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Exam (60)</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Total (100)</th>
              <th className="text-center px-3 py-2 border-b border-slate-200">Grade</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr><td colSpan={6} className="py-6 text-center text-slate-500">No results published for this term.</td></tr>
            ) : results.map(r => (
              <tr key={r.id} className="border-b border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-900">{r.subject.name}</td>
                <td className="px-3 py-2 text-right">{r.ca1}</td>
                <td className="px-3 py-2 text-right">{r.ca2}</td>
                <td className="px-3 py-2 text-right">{r.exam}</td>
                <td className="px-3 py-2 text-right font-semibold">{r.total}</td>
                <td className="px-3 py-2 text-center">
                  {r.grade && <span className={`inline-block px-2 py-0.5 rounded font-semibold ${gradeColor[r.grade] ?? "bg-slate-100"}`}>{r.grade}</span>}
                </td>
              </tr>
            ))}
          </tbody>
          {results.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-3 py-2">TOTAL</td>
                <td colSpan={3} />
                <td className="px-3 py-2 text-right">{total}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 mb-6 text-sm">
          <div className="border border-slate-200 rounded p-3">
            <p className="text-xs text-slate-500">Average</p>
            <p className="text-xl font-bold text-brand-900">{avg}%</p>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <p className="text-xs text-slate-500">Position</p>
            <p className="text-xl font-bold text-brand-900">{position ? `${position}${classSize > 0 ? ` of ${classSize}` : ""}` : "—"}</p>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <p className="text-xs text-slate-500">Subjects</p>
            <p className="text-xl font-bold text-brand-900">{results.length}</p>
          </div>
          <div className="border border-slate-200 rounded p-3">
            <p className="text-xs text-slate-500">Attendance</p>
            <p className="text-xl font-bold text-brand-900">{totalAtt > 0 ? `${attRate}%` : "—"}</p>
          </div>
        </div>

        {/* Attendance breakdown */}
        <h3 className="font-display text-lg font-bold text-brand-900 mb-2">Attendance</h3>
        <table className="w-full text-sm border border-slate-200 mb-6">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-700">
            <tr>
              <th className="text-left px-3 py-2 border-b border-slate-200">Days recorded</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Present</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Absent</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Late</th>
              <th className="text-right px-3 py-2 border-b border-slate-200">Attendance rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 font-medium">{totalAtt}</td>
              <td className="px-3 py-2 text-right text-emerald-700">{present}</td>
              <td className="px-3 py-2 text-right text-rose-700">{absent}</td>
              <td className="px-3 py-2 text-right text-amber-700">{late}</td>
              <td className="px-3 py-2 text-right font-semibold">{totalAtt > 0 ? `${attRate}%` : "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* Awards */}
        {awards.length > 0 && (
          <>
            <h3 className="font-display text-lg font-bold text-brand-900 mb-2">Awards & Recognition</h3>
            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {awards.map(a => (
                <div key={a.id} className="border border-gold-200 bg-gold-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gold-500 text-xs">{"★".repeat(a.stars)}{"☆".repeat(5 - a.stars)}</span>
                    <span className="text-[11px] uppercase tracking-wide text-gold-700 font-semibold">
                      {a.category.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-brand-900">{a.title}</p>
                  {a.citation && <p className="text-xs text-slate-600 italic mt-0.5">"{a.citation}"</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Comments — class teacher + principal */}
        {(termReport?.classTeacherComment || termReport?.principalComment) && (
          <>
            <h3 className="font-display text-lg font-bold text-brand-900 mb-2">Comments</h3>
            <div className="space-y-3 mb-6">
              {termReport.classTeacherComment && (
                <div className="border border-slate-200 bg-slate-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Class Teacher's Comment</p>
                  <p className="text-sm text-slate-800 mt-1.5 leading-relaxed whitespace-pre-wrap">{termReport.classTeacherComment}</p>
                  {termReport.classTeacherByName && (
                    <p className="text-[11px] text-slate-500 italic mt-2">— {termReport.classTeacherByName}</p>
                  )}
                </div>
              )}
              {termReport.principalComment && (
                <div className="border border-gold-200 bg-gold-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gold-700 font-semibold">Principal's Comment</p>
                  <p className="text-sm text-slate-800 mt-1.5 leading-relaxed whitespace-pre-wrap">{termReport.principalComment}</p>
                  {termReport.principalByName && (
                    <p className="text-[11px] text-slate-600 italic mt-2">— {termReport.principalByName}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-4 border-t border-slate-200 text-sm">
          <div>
            <div className="h-12 border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Class Teacher{termReport?.classTeacherByName && ` (${termReport.classTeacherByName})`}</p>
          </div>
          <div>
            <div className="h-12 border-b border-slate-300 mb-1" />
            <p className="text-xs text-slate-500">Principal / Director{termReport?.principalByName && ` (${termReport.principalByName})`}</p>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8">
          Generated by {SCHOOL.name} Portal · {dateFmt.format(new Date())}
        </p>
      </div>

      <div className="h-6 print:hidden" />
    </div>
  );
}

