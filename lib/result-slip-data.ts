/**
 * Shared loader for result-slip data. Used by both the HTML print page
 * and the PDF generator so they always show identical numbers.
 *
 * Returns null when the term has no published results AND no attendance —
 * caller decides what to do (404 vs render empty). Returns the shaped
 * data otherwise.
 */

import { prisma } from "./prisma";
import type { ResultSlipData } from "@/components/ResultSlipPdf";

export async function loadResultSlipData(
  studentId: string,
  termId: string,
): Promise<ResultSlipData | null> {
  const [student, term] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
        classRef: true,
        parentLinks: { include: { parent: { include: { user: { select: { name: true } } } } } },
      },
    }),
    prisma.term.findUnique({ where: { id: termId }, include: { session: true } }),
  ]);
  if (!student || !term) return null;

  const [results, attendance, awards, classSize] = await Promise.all([
    prisma.result.findMany({
      where: { studentId, termId, isPublished: true },
      include: { subject: { select: { name: true, code: true } } },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.attendance.findMany({
      where: { studentId, termId },
      select: { status: true },
    }),
    prisma.award.findMany({
      where: { studentId, OR: [{ termId }, { termId: null }] },
      orderBy: { awardedAt: "desc" },
      take: 8,
    }),
    student.classId ? prisma.student.count({ where: { classId: student.classId } }) : Promise.resolve(0),
  ]);

  const presentCount = attendance.filter(a => a.status === "PRESENT").length;
  const absentCount = attendance.filter(a => a.status === "ABSENT").length;
  const lateCount = attendance.filter(a => a.status === "LATE").length;
  const total = attendance.length;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  const totalScore = results.reduce((s, r) => s + r.total, 0);
  const avg = results.length > 0 ? Math.round((totalScore / results.length) * 10) / 10 : 0;
  const position = results.find(r => r.position !== null)?.position ?? null;

  return {
    student: {
      name: student.user.name,
      admissionNumber: student.admissionNumber,
      className: student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "—",
      gender: student.gender ?? null,
      dob: student.dob ?? null,
      parentName: student.parentLinks[0]?.parent.user.name ?? null,
    },
    term: {
      label: `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term`,
      sessionName: term.session.name,
    },
    results: results.map(r => ({
      id: r.id,
      subjectName: r.subject.name,
      ca1: r.ca1,
      ca2: r.ca2,
      exam: r.exam,
      total: r.total,
      grade: r.grade,
    })),
    attendance: { total, present: presentCount, absent: absentCount, late: lateCount, rate },
    summary: { avg, position, classSize },
    awards: awards.map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      stars: a.stars,
      citation: a.citation,
    })),
  };
}
