"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Meclones123!";

export async function createTeacher(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const formTeacherOf = String(formData.get("formTeacherOf") ?? "").trim();
  const subjectIds = formData.getAll("subjectIds").map(v => String(v)).filter(Boolean);
  const classIds = formData.getAll("classIds").map(v => String(v)).filter(Boolean);

  if (!name || !email) throw new Error("Name and email are required.");

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, phone: phone || null, role: "TEACHER" as never, isActive: true },
    create: {
      name,
      email,
      phone: phone || null,
      role: "TEACHER" as never,
      passwordHash,
      isActive: true,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { userId: user.id },
    update: { bio: bio || undefined },
    create: { userId: user.id, bio: bio || undefined },
  });

  // Reset and re-create subject/class links so editing is idempotent.
  await prisma.subjectTeacher.deleteMany({ where: { teacherId: teacher.id } });
  await prisma.classTeacher.deleteMany({ where: { teacherId: teacher.id } });

  if (subjectIds.length > 0) {
    await prisma.subjectTeacher.createMany({
      data: subjectIds.map(subjectId => ({ teacherId: teacher.id, subjectId })),
      skipDuplicates: true,
    });
  }
  if (classIds.length > 0) {
    await prisma.classTeacher.createMany({
      data: classIds.map(classId => ({ teacherId: teacher.id, classId })),
      skipDuplicates: true,
    });
  }

  // Form-teacher: set this teacher as classTeacherId on the picked class; also
  // clear them as form teacher of any other class to keep the 1-form-teacher
  // invariant.
  if (formTeacherOf) {
    await prisma.class.updateMany({
      where: { classTeacherId: teacher.id },
      data: { classTeacherId: null },
    });
    await prisma.class.update({
      where: { id: formTeacherOf },
      data: { classTeacherId: teacher.id },
    });
  }

  revalidatePath("/portal/admin/teachers");
  revalidatePath("/portal/admin");
  revalidatePath("/portal/director");
  redirect(`/portal/admin/teachers?added=${encodeURIComponent(name)}`);
}
