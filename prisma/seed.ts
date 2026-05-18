import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Meclones123!";

const DEMO_USERS = [
  { name: "Mrs. Olufunke Adebayo", email: "director@meclonescollege.com", role: "DIRECTOR", phone: "+2348030000001" },
  { name: "Super Admin", email: "superadmin@meclonescollege.com", role: "SUPER_ADMIN", phone: "+2348030000000" },
  { name: "Mr. Kelechi Nnamdi", email: "admin@meclonescollege.com", role: "ADMIN", phone: "+2348030000002" },
  { name: "Mr. Sola Akinwale", email: "accountant@meclonescollege.com", role: "ACCOUNTANT", phone: "+2348030000003" },
  { name: "Mrs. Adaeze Obi", email: "teacher@meclonescollege.com", role: "TEACHER", phone: "+2348031110001" },
  { name: "Yusuf Bello", email: "student@meclonescollege.com", role: "STUDENT", phone: "+2348071110001" },
  { name: "Dr. Aisha Bello", email: "parent@meclonescollege.com", role: "PARENT", phone: "+2348061110002" },
] as const;

async function main() {
  console.log(`Seeding with default password: ${DEFAULT_PASSWORD}`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // --- Users (idempotent: upsert by email) ---
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, role: u.role, isActive: true },
      create: {
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`  ✓ ${u.role.padEnd(12)} ${u.email}`);
  }

  // --- Academic session + terms ---
  const session = await prisma.academicSession.upsert({
    where: { name: "2026/2027" },
    update: { isActive: true },
    create: {
      name: "2026/2027",
      isActive: true,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-07-31"),
    },
  });
  console.log(`  ✓ Session       ${session.name}`);

  for (const t of ["FIRST", "SECOND", "THIRD"] as const) {
    await prisma.term.upsert({
      where: { name_sessionId: { name: t, sessionId: session.id } },
      update: { isActive: t === "FIRST" },
      create: {
        name: t,
        sessionId: session.id,
        isActive: t === "FIRST",
      },
    });
  }
  console.log(`  ✓ Terms         FIRST · SECOND · THIRD (FIRST active)`);

  // --- Subjects ---
  const SUBJECTS = [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science & Tech", code: "BST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Biology", code: "BIO" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Further Maths", code: "FMTH" },
  ];
  for (const s of SUBJECTS) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name },
      create: s,
    });
  }
  console.log(`  ✓ Subjects      ${SUBJECTS.length} created`);

  // --- Classes ---
  const CLASSES = [
    { name: "JSS 1", arm: "A", level: "JSS" as const },
    { name: "JSS 1", arm: "B", level: "JSS" as const },
    { name: "JSS 2", arm: "A", level: "JSS" as const },
    { name: "JSS 3", arm: "A", level: "JSS" as const },
    { name: "SS 1", arm: "A", level: "SSS" as const },
    { name: "SS 2", arm: "A", level: "SSS" as const },
    { name: "SS 3", arm: "A", level: "SSS" as const },
  ];
  for (const c of CLASSES) {
    await prisma.class.upsert({
      where: { name_arm: { name: c.name, arm: c.arm } },
      update: { level: c.level },
      create: c,
    });
  }
  console.log(`  ✓ Classes       ${CLASSES.length} created`);

  // --- Link teacher → SS 3 A, student → SS 3 A, parent → student ---
  const teacherUser = await prisma.user.findUnique({ where: { email: "teacher@meclonescollege.com" } });
  const studentUser = await prisma.user.findUnique({ where: { email: "student@meclonescollege.com" } });
  const parentUser = await prisma.user.findUnique({ where: { email: "parent@meclonescollege.com" } });
  const ss3a = await prisma.class.findUnique({ where: { name_arm: { name: "SS 3", arm: "A" } } });

  if (teacherUser) {
    await prisma.teacher.upsert({
      where: { userId: teacherUser.id },
      update: { bio: "Head of English Department" },
      create: { userId: teacherUser.id, bio: "Head of English Department" },
    });
  }

  if (studentUser && ss3a) {
    await prisma.student.upsert({
      where: { userId: studentUser.id },
      update: { classId: ss3a.id },
      create: {
        admissionNumber: "MCL/SS3A/2526/001",
        userId: studentUser.id,
        classId: ss3a.id,
        gender: "MALE",
        dob: new Date("2008-03-17"),
      },
    });
  }

  if (parentUser && studentUser) {
    const parent = await prisma.parent.upsert({
      where: { userId: parentUser.id },
      update: { whatsappOptIn: true },
      create: { userId: parentUser.id, whatsappOptIn: true },
    });
    const studentRec = await prisma.student.findUnique({ where: { userId: studentUser.id } });
    if (studentRec) {
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: studentRec.id } },
        update: { relation: "Mother" },
        create: { parentId: parent.id, studentId: studentRec.id, relation: "Mother" },
      });
    }
  }
  console.log(`  ✓ Linked teacher / student / parent for demo`);

  console.log("\nDone.\n");
  console.log("Demo logins (all share the same password):");
  console.log(`  password: ${DEFAULT_PASSWORD}`);
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(12)} ${u.email}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
