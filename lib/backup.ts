/**
 * Shared backup-building logic. Used by both the on-demand admin export
 * (/api/admin/export/backup) and the scheduled cron upload to Cloudinary
 * (/api/cron/backup) so the snapshot shape stays in lock-step.
 */

import { prisma } from "./prisma";

export const BACKUP_SCHEMA_VERSION = "2026-05-25";

export interface BackupMeta {
  exportedAt: string;
  exportedBy: { id?: string; name?: string; email?: string; role?: string } | null;
  source: "manual" | "cron";
}

/**
 * Build a portable, restore-from-scratch JSON snapshot of every domain
 * table. Passwords + TOTP secrets are intentionally omitted. Notifications
 * + audit log are capped at the 10,000 most-recent rows.
 */
export async function buildBackupPayload(meta: BackupMeta) {
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
    prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 10_000 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10_000 }),
    prisma.notificationPrefs.findMany(),
  ]);

  const payload = {
    meta: {
      school: "Meclones College Lekki",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: meta.exportedAt,
      exportedBy: meta.exportedBy,
      source: meta.source,
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

  return payload;
}
