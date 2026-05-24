"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { notify } from "@/lib/notify";
import { sendNewMessageThreadEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

function readAttachment(formData: FormData) {
  const url = String(formData.get("attachmentUrl") ?? "").trim();
  if (!url) return null;
  return {
    attachmentUrl: url,
    attachmentName: String(formData.get("attachmentName") ?? "").trim() || null,
    attachmentMime: String(formData.get("attachmentMime") ?? "").trim() || null,
    attachmentSize: (() => {
      const n = Number(formData.get("attachmentSize"));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    })(),
  };
}

const NewThreadSchema = z.object({
  teacherId: z.string().min(1),
  studentId: z.string().optional().or(z.literal("")),
  subject: z.string().min(2, "Subject is required"),
  body: z.string().min(2, "Write something"),
});

/**
 * Parent-initiated: open a new conversation with a teacher about one of
 * their own children. Auth: must be PARENT and the studentId must be a
 * child linked to this parent.
 */
export async function startThreadAsParent(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "PARENT") redirect("/portal/login");

  const parsed = NewThreadSchema.safeParse({
    teacherId: formData.get("teacherId"),
    studentId: formData.get("studentId") || undefined,
    subject: String(formData.get("subject") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/parent/messages/new?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
  if (!parent) redirect("/portal/login");

  // Authorise the studentId: must be one of this parent's children.
  if (d.studentId) {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: parent.id, studentId: d.studentId },
    });
    if (!link) redirect("/portal/parent/messages/new?error=" + encodeURIComponent("Not your child"));
  }

  const thread = await prisma.messageThread.create({
    data: {
      parentId: parent.id,
      teacherId: d.teacherId,
      studentId: d.studentId || null,
      subject: d.subject,
      lastMessageAt: new Date(),
      teacherUnread: 1, // initial message is unread for the teacher
    },
  });

  const attachment = readAttachment(formData);
  await prisma.message.create({
    data: { threadId: thread.id, authorId: user.id, body: d.body, ...(attachment ?? {}) },
  });

  // Bell-ping the teacher + email them too.
  const teacher = await prisma.teacher.findUnique({
    where: { id: d.teacherId },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (teacher) {
    notify({
      userIds: [teacher.userId],
      type: "GENERIC",
      title: `New message from ${user.name}`,
      body: d.subject,
      href: `/portal/teacher/messages/${thread.id}`,
    }).catch(err => console.error("[messages] notify failed", err));

    if (teacher.user.email) {
      const studentName = d.studentId
        ? (await prisma.student.findUnique({ where: { id: d.studentId }, select: { user: { select: { name: true } } } }))?.user.name
        : null;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
      sendNewMessageThreadEmail({
        to: teacher.user.email,
        recipientName: teacher.user.name,
        fromName: user.name,
        fromRole: "PARENT",
        subject: d.subject,
        bodyPreview: d.body,
        studentName,
        hasAttachment: Boolean(attachment),
        threadUrl: `${siteUrl}/portal/teacher/messages/${thread.id}`,
      }).catch(err => console.error("[messages] email failed", err));
    }
  }

  revalidatePath("/portal/parent/messages");
  revalidatePath("/portal/teacher/messages");
  redirect(`/portal/parent/messages/${thread.id}`);
}

/**
 * Teacher-initiated: open a new conversation with a parent of a student
 * in one of this teacher's classes. Auth: must be TEACHER; the parent
 * must have at least one child whose class the teacher teaches (either
 * as form teacher or subject teacher). studentId is required so the
 * thread is anchored to the right child.
 */
const TeacherNewThreadSchema = z.object({
  parentId: z.string().min(1),
  studentId: z.string().min(1),
  subject: z.string().min(2, "Subject is required"),
  body: z.string().min(2, "Write something"),
});

export async function startThreadAsTeacher(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "TEACHER") redirect("/portal/login");

  // Form sends `recipientKey="<parentId>|<studentId>"` from a single select,
  // OR explicit parentId/studentId pair (e.g. from a deep link). Accept either.
  const raw = String(formData.get("recipientKey") ?? "");
  let parentId = String(formData.get("parentId") ?? "");
  let studentId = String(formData.get("studentId") ?? "");
  if ((!parentId || !studentId) && raw.includes("|")) {
    const [p, s] = raw.split("|");
    parentId = parentId || p;
    studentId = studentId || s;
  }

  const parsed = TeacherNewThreadSchema.safeParse({
    parentId,
    studentId,
    subject: String(formData.get("subject") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/teacher/messages/new?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      classTeacherOf: { select: { id: true } },
      classes: { select: { classId: true } },
    },
  });
  if (!teacher) redirect("/portal/login");

  const allowedClassIds = new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]);

  // Authorise: studentId must belong to a class this teacher teaches, AND
  // the parentId must be linked to that student.
  const student = await prisma.student.findUnique({
    where: { id: d.studentId },
    select: {
      classId: true,
      user: { select: { name: true } },
      parentLinks: { where: { parentId: d.parentId }, select: { id: true } },
    },
  });
  if (!student) {
    redirect("/portal/teacher/messages/new?error=" + encodeURIComponent("Student not found"));
  }
  if (!student!.classId || !allowedClassIds.has(student!.classId)) {
    redirect("/portal/teacher/messages/new?error=" + encodeURIComponent("Not your class"));
  }
  if (student!.parentLinks.length === 0) {
    redirect("/portal/teacher/messages/new?error=" + encodeURIComponent("That parent isn't linked to that child"));
  }

  const thread = await prisma.messageThread.create({
    data: {
      parentId: d.parentId,
      teacherId: teacher.id,
      studentId: d.studentId,
      subject: d.subject,
      lastMessageAt: new Date(),
      parentUnread: 1, // initial message is unread for the parent
    },
  });

  const teacherAttachment = readAttachment(formData);
  await prisma.message.create({
    data: { threadId: thread.id, authorId: user.id, body: d.body, ...(teacherAttachment ?? {}) },
  });

  // Bell-ping the parent + email them too.
  const parent = await prisma.parent.findUnique({
    where: { id: d.parentId },
    select: { userId: true, user: { select: { name: true, email: true } } },
  });
  if (parent) {
    notify({
      userIds: [parent.userId],
      type: "GENERIC",
      title: `New message from ${user.name}`,
      body: d.subject,
      href: `/portal/parent/messages/${thread.id}`,
    }).catch(err => console.error("[messages] notify failed", err));

    if (parent.user.email) {
      const studentName = (await prisma.student.findUnique({
        where: { id: d.studentId },
        select: { user: { select: { name: true } } },
      }))?.user.name;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
      sendNewMessageThreadEmail({
        to: parent.user.email,
        recipientName: parent.user.name,
        fromName: user.name,
        fromRole: "TEACHER",
        subject: d.subject,
        bodyPreview: d.body,
        studentName,
        hasAttachment: Boolean(teacherAttachment),
        threadUrl: `${siteUrl}/portal/parent/messages/${thread.id}`,
      }).catch(err => console.error("[messages] email failed", err));
    }
  }

  revalidatePath("/portal/teacher/messages");
  revalidatePath("/portal/parent/messages");
  redirect(`/portal/teacher/messages/${thread.id}`);
}

/**
 * Reply on an existing thread. Auth: must be the parent or the teacher
 * of the thread (or an admin reading the thread). At least one of body
 * or attachment must be present.
 */
export async function sendReply(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const threadId = String(formData.get("threadId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const attachment = readAttachment(formData);

  if (!threadId) return;
  if (!body && !attachment) return; // Empty submit — silently ignore.

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      parent: { select: { userId: true } },
      teacher: { select: { userId: true, user: { select: { name: true } } } },
    },
  });
  if (!thread) return;

  const isParent = thread.parent.userId === user.id;
  const isTeacher = thread.teacher.userId === user.id;
  if (!isParent && !isTeacher) {
    if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) return;
  }

  await prisma.message.create({
    data: {
      threadId: thread.id,
      authorId: user.id,
      body: body || (attachment ? `📎 ${attachment.attachmentName ?? "attachment"}` : ""),
      ...(attachment ?? {}),
    },
  });

  await prisma.messageThread.update({
    where: { id: thread.id },
    data: {
      lastMessageAt: new Date(),
      ...(isParent ? { teacherUnread: { increment: 1 } } : {}),
      ...(isTeacher ? { parentUnread: { increment: 1 } } : {}),
    },
  });

  // Bell-ping the other side.
  const recipientUserId = isParent ? thread.teacher.userId : thread.parent.userId;
  const previewSource = body || (attachment ? `📎 ${attachment.attachmentName ?? "attachment"}` : "");
  notify({
    userIds: [recipientUserId],
    type: "GENERIC",
    title: `New reply from ${user.name}`,
    body: previewSource.length > 160 ? previewSource.slice(0, 157) + "..." : previewSource,
    href: isParent ? `/portal/teacher/messages/${thread.id}` : `/portal/parent/messages/${thread.id}`,
  }).catch(err => console.error("[messages] notify failed", err));

  revalidatePath(`/portal/parent/messages/${thread.id}`);
  revalidatePath(`/portal/teacher/messages/${thread.id}`);
  revalidatePath("/portal/parent/messages");
  revalidatePath("/portal/teacher/messages");
}

/** Zero out unread counter for the caller's side when they open the thread. */
export async function markThreadRead(threadId: string) {
  const user = await getSessionUser();
  if (!user) return;
  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: { parent: { select: { userId: true } }, teacher: { select: { userId: true } } },
  });
  if (!thread) return;
  if (thread.parent.userId === user.id && thread.parentUnread > 0) {
    await prisma.messageThread.update({ where: { id: threadId }, data: { parentUnread: 0 } });
  } else if (thread.teacher.userId === user.id && thread.teacherUnread > 0) {
    await prisma.messageThread.update({ where: { id: threadId }, data: { teacherUnread: 0 } });
  }
}
