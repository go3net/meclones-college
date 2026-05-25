"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createResetToken } from "@/lib/password-reset";
import { sendWelcomeEmail } from "@/lib/resend";
import { SCHOOL } from "@/lib/constants";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Meclones123!";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
}

export async function createStudent(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dob = String(formData.get("dob") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim().toUpperCase();
  const classId = String(formData.get("classId") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const parentEmail = String(formData.get("parentEmail") ?? "").trim().toLowerCase();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const parentPhone = String(formData.get("parentPhone") ?? "").trim();

  if (!firstName || !lastName || !classId) {
    throw new Error("First name, last name and class are required.");
  }

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new Error("Class not found.");

  // Compute next admission number for this class+arm. Pattern MCL/<CLASSARM>/2526/<seq>.
  const prefix = `MCL/${cls.name.replace(/\s+/g, "")}${cls.arm}/2526/`;
  const existingCount = await prisma.student.count({
    where: { admissionNumber: { startsWith: prefix } },
  });
  const admissionNumber = `${prefix}${String(existingCount + 1).padStart(3, "0")}`;

  const fullName = `${firstName} ${lastName}`;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Student User account — email derived from admission # so we don't collide
  // (real student email can be set later by admin).
  const studentEmail = `student.${slugify(admissionNumber)}@meclones.local`;

  const studentUser = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { name: fullName, isActive: true, role: "STUDENT" as never, image: photoUrl ?? undefined },
    create: {
      name: fullName,
      email: studentEmail,
      role: "STUDENT" as never,
      passwordHash,
      isActive: true,
      image: photoUrl,
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {
      admissionNumber, classId: cls.id,
      gender: (gender === "MALE" || gender === "FEMALE") ? gender : undefined,
      dob: dob ? new Date(dob) : null,
      photoUrl: photoUrl ?? undefined,
    },
    create: {
      admissionNumber,
      userId: studentUser.id,
      classId: cls.id,
      gender: (gender === "MALE" || gender === "FEMALE") ? gender : undefined,
      dob: dob ? new Date(dob) : null,
      photoUrl,
    },
  });

  // Optional parent: if a parentEmail was provided, upsert a Parent User +
  // Parent row + link.
  if (parentEmail && parentName) {
    const existingParentUser = await prisma.user.findUnique({ where: { email: parentEmail }, select: { id: true } });
    const isNewParentUser = !existingParentUser;

    const parentUser = await prisma.user.upsert({
      where: { email: parentEmail },
      update: { name: parentName, phone: parentPhone || null, role: "PARENT" as never, isActive: true },
      create: {
        name: parentName,
        email: parentEmail,
        phone: parentPhone || null,
        role: "PARENT" as never,
        passwordHash,
        isActive: true,
      },
    });
    const parent = await prisma.parent.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: { userId: parentUser.id },
    });
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
      update: {},
      create: { parentId: parent.id, studentId: student.id, relation: "Parent" },
    });

    // Welcome email only when we actually created the parent's User.
    if (isNewParentUser) {
      try {
        const token = await createResetToken(parentEmail, { ttlHours: 24 * 7 });
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
        await sendWelcomeEmail({
          to: parentEmail,
          recipientName: parentName,
          role: "PARENT",
          loginEmail: parentEmail,
          setPasswordUrl: `${siteUrl}/portal/reset-password/${token}`,
          loginUrl: `${siteUrl}/portal/login`,
          children: [{
            name: fullName,
            admissionNumber,
            className: `${cls.name}${cls.arm}`,
          }],
        });
      } catch (err) {
        console.error("[students] parent welcome email failed", err);
      }
    }
  }

  revalidatePath("/portal/admin/students");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/director");
  redirect(`/portal/admin/students?added=${encodeURIComponent(admissionNumber)}`);
}
