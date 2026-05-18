import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Get the current session user with id + role, or null.
 * Use inside server components.
 */
export async function getSessionUser() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string; name?: string | null; email?: string | null } | undefined;
  if (!user?.id || !user.role) return null;
  return { id: user.id, role: user.role, name: user.name ?? "", email: user.email ?? "" };
}

/**
 * Require a specific role (or one of several). Redirects to /portal/login on
 * unauthenticated, or to the user's own home dashboard on role mismatch.
 */
export async function requireRole(roles: string | string[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  if (!allowed.includes(user.role)) redirect("/portal/me");
  return user;
}

/** Resolve the Parent row for the logged-in user, eager-loading linked children. */
export async function getCurrentParentWithChildren() {
  const user = await requireRole("PARENT");
  const parent = await prisma.parent.findUnique({
    where: { userId: user.id },
    include: {
      children: {
        include: {
          student: {
            include: {
              classRef: true,
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!parent) redirect("/portal/login");
  return parent;
}

/** Resolve the Student row for the logged-in user. */
export async function getCurrentStudent() {
  const user = await requireRole("STUDENT");
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    include: {
      classRef: true,
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (!student) redirect("/portal/login");
  return student;
}

/** Resolve the Teacher row for the logged-in user. */
export async function getCurrentTeacher() {
  const user = await requireRole("TEACHER");
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    include: {
      classTeacherOf: true,
      classes: { include: { class: true } },
      subjects: { include: { subject: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (!teacher) redirect("/portal/login");
  return teacher;
}

/** Get the currently active academic session + term. */
export async function getActiveContext() {
  const [session, term] = await Promise.all([
    prisma.academicSession.findFirst({ where: { isActive: true } }),
    prisma.term.findFirst({ where: { isActive: true }, include: { session: true } }),
  ]);
  return { session, term };
}
