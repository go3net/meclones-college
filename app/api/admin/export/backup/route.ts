/**
 * Full-database JSON backup. One file containing every row from every
 * domain model — useful as a portable restore-from-scratch artifact
 * independent of the underlying Postgres binary backup that Railway
 * manages automatically.
 *
 * The export is *not* expected to be small — large schools can produce
 * tens of megabytes. The endpoint streams the JSON object as a single
 * blob, gzipped via the browser if Accept-Encoding allows it.
 *
 * DIRECTOR / SUPER_ADMIN only. Sensitive — passwordHashes and TOTP
 * secrets are excluded to make accidental sharing less catastrophic.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCHEMA_VERSION = "2026-05-25";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Pull every table. Order matters only for human readability — we
  // strip secrets from User rows before they leave the DB layer.
  const [
    users, students, parents, teachers, classes, subjects,
    classSubjects, subjectTeachers, classTeachers, parentStudents,
    sessions, terms,
    results, attendance, fees, payments, feeStructures,
    awards, studentNotes, healthRecords, disciplinaryCases,
    messageThreads, messages,
    timetableEntries, studentTermReports,
    announcements, complaints, admissions, contactMessages,
    galleryImages, blogPosts,
    books, bookRequests,
    notifications, auditLogs,
    notificationPrefs,
  ] = await Promise.all([
    prisma.user.findMany({ select: {
      id: true, name: true, email: true, phone: true, role: true,
      isActive: true, image: true, emailVerified: true,
      createdAt: true, updatedAt: true,
      // OMITTED: passwordHash, totpSecret
    } }),
    prisma.student.findMany(),
    prisma.parent.findMany(),
    prisma.teacher.findMany(),
    prisma.class.findMany(),
    prisma.subject.findMany(),
    prisma.classSubject.findMany(),
    prisma.subjectTeacher.findMany(),
    prisma.classTeacher.findMany(),
    prisma.parentStudent.findMany(),
    prisma.academicSession.findMany(),
    prisma.term.findMany(),
    prisma.result.findMany(),
    prisma.attendance.findMany(),
    prisma.fee.findMany(),
    prisma.payment.findMany(),
    prisma.feeStructure.findMany(),
    prisma.award.findMany(),
    prisma.studentNote.findMany(),
    prisma.healthRecord.findMany(),
    prisma.disciplinaryCase.findMany(),
    prisma.messageThread.findMany(),
    prisma.message.findMany(),
    prisma.timetableEntry.findMany(),
    prisma.studentTermReport.findMany(),
    prisma.announcement.findMany(),
    prisma.complaint.findMany(),
    prisma.admission.findMany(),
    prisma.contactMessage.findMany(),
    prisma.galleryImage.findMany(),
    prisma.blogPost.findMany(),
    prisma.book.findMany(),
    prisma.bookRequest.findMany(),
    // Cap notifications + audit log — these grow huge. Full export
    // belongs in pg_dump; this is the "useful, human-readable" copy.
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 10000 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10000 }),
    prisma.notificationPrefs.findMany(),
  ]);

  const payload = {
    meta: {
      school: "Meclones College Lekki",
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, name: user.name, email: user.email, role: user.role },
      note: "Passwords and TOTP secrets are intentionally omitted. Notification + AuditLog capped at 10k most recent rows.",
    },
    counts: {
      users: users.length,
      students: students.length,
      parents: parents.length,
      teachers: teachers.length,
      classes: classes.length,
      results: results.length,
      attendance: attendance.length,
      fees: fees.length,
      payments: payments.length,
    },
    tables: {
      User: users,
      Student: students,
      Parent: parents,
      Teacher: teachers,
      Class: classes,
      Subject: subjects,
      ClassSubject: classSubjects,
      SubjectTeacher: subjectTeachers,
      ClassTeacher: classTeachers,
      ParentStudent: parentStudents,
      AcademicSession: sessions,
      Term: terms,
      Result: results,
      Attendance: attendance,
      Fee: fees,
      Payment: payments,
      FeeStructure: feeStructures,
      Award: awards,
      StudentNote: studentNotes,
      HealthRecord: healthRecords,
      DisciplinaryCase: disciplinaryCases,
      MessageThread: messageThreads,
      Message: messages,
      TimetableEntry: timetableEntries,
      StudentTermReport: studentTermReports,
      Announcement: announcements,
      Complaint: complaints,
      Admission: admissions,
      ContactMessage: contactMessages,
      GalleryImage: galleryImages,
      BlogPost: blogPosts,
      Book: books,
      BookRequest: bookRequests,
      Notification: notifications,
      AuditLog: auditLogs,
      NotificationPrefs: notificationPrefs,
    },
  };

  auditLog({
    action: "export.full_backup",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: payload.counts,
  });

  const filename = `meclones_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
