import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Meclones123!";

// ============================================================
// REFERENCE LISTS
// ============================================================

const TEACHERS_DATA = [
  { name: "Mrs. Adaeze Obi", email: "teacher@meclonescollege.com", phone: "+2348031110001", bio: "Head of English Department", subjects: ["ENG"], formTeacherOf: { name: "JSS 1", arm: "A" } },
  { name: "Mr. Tunde Bakare", email: "tunde.bakare@meclonescollege.com", phone: "+2348031110002", bio: "Mathematics specialist", subjects: ["MTH", "FMTH"], formTeacherOf: { name: "JSS 2", arm: "A" } },
  { name: "Dr. Chioma Eze", email: "chioma.eze@meclonescollege.com", phone: "+2348031110003", bio: "Head of Sciences, PhD Biology", subjects: ["BIO"], formTeacherOf: { name: "SS 1", arm: "A" } },
  { name: "Mr. Femi Adekunle", email: "femi.adekunle@meclonescollege.com", phone: "+2348031110004", bio: "Physics & advanced maths", subjects: ["PHY"], formTeacherOf: { name: "SS 3", arm: "A" } },
  { name: "Mrs. Ngozi Umeh", email: "ngozi.umeh@meclonescollege.com", phone: "+2348031110005", bio: "Basic Science & Tech", subjects: ["BST"], formTeacherOf: { name: "JSS 1", arm: "B" } },
  { name: "Mr. Bello Yakubu", email: "bello.yakubu@meclonescollege.com", phone: "+2348031110006", bio: "Civic Education & social studies", subjects: ["CIV"], formTeacherOf: { name: "JSS 3", arm: "A" } },
  { name: "Mrs. Funke Adesanya", email: "funke.adesanya@meclonescollege.com", phone: "+2348031110007", bio: "Chemistry specialist", subjects: ["CHM"], formTeacherOf: { name: "SS 2", arm: "A" } },
  { name: "Mr. Olamide Sanwo", email: "olamide.sanwo@meclonescollege.com", phone: "+2348031110008", bio: "WAEC English moderator", subjects: ["ENG"], formTeacherOf: null as { name: string; arm: string } | null },
] as const;

const PARENTS_DATA = [
  { name: "Mr. & Mrs. Okafor", email: "okafor.family@example.com", phone: "+2348061110001" },
  { name: "Dr. Aisha Bello", email: "parent@meclonescollege.com", phone: "+2348061110002" },
  { name: "Mr. Olumide Johnson", email: "olumide.j@example.com", phone: "+2348061110003" },
  { name: "Mrs. Funmi Adesina", email: "funmi.adesina@example.com", phone: "+2348061110004" },
  { name: "Mr. Ibrahim Musa", email: "ibrahim.musa@example.com", phone: "+2348061110005" },
  { name: "Mrs. Adebola Adeyemi", email: "adebola.a@example.com", phone: "+2348061110006" },
  { name: "Mr. & Mrs. Eze", email: "eze.family@example.com", phone: "+2348061110007" },
  { name: "Dr. Nnamdi Obi", email: "nnamdi.obi@example.com", phone: "+2348061110008" },
] as const;

// Students per class — admission #s use pattern MCL/<class><arm>/2526/<seq>
const STUDENTS_DATA: { name: string; gender: "MALE" | "FEMALE"; class: string; arm: string; parentEmail: string; dobYear: number }[] = [
  // SS 3 A (small intensive WAEC class)
  { name: "Yusuf Bello",        gender: "MALE",   class: "SS 3", arm: "A", parentEmail: "parent@meclonescollege.com", dobYear: 2008 },
  { name: "Tolulope Adesina",   gender: "FEMALE", class: "SS 3", arm: "A", parentEmail: "funmi.adesina@example.com",  dobYear: 2008 },
  { name: "Chinedu Eze",        gender: "MALE",   class: "SS 3", arm: "A", parentEmail: "eze.family@example.com",     dobYear: 2008 },
  { name: "Halima Musa",        gender: "FEMALE", class: "SS 3", arm: "A", parentEmail: "ibrahim.musa@example.com",   dobYear: 2008 },
  { name: "Tochi Obi",          gender: "FEMALE", class: "SS 3", arm: "A", parentEmail: "nnamdi.obi@example.com",     dobYear: 2008 },

  // SS 2 A
  { name: "Adebanke Adeyemi",   gender: "FEMALE", class: "SS 2", arm: "A", parentEmail: "adebola.a@example.com",      dobYear: 2009 },
  { name: "Ibrahim Musa Jr.",   gender: "MALE",   class: "SS 2", arm: "A", parentEmail: "ibrahim.musa@example.com",   dobYear: 2009 },
  { name: "Emeka Okafor",       gender: "MALE",   class: "SS 2", arm: "A", parentEmail: "okafor.family@example.com",  dobYear: 2009 },
  { name: "Aisha Yusuf",        gender: "FEMALE", class: "SS 2", arm: "A", parentEmail: "parent@meclonescollege.com", dobYear: 2009 },

  // SS 1 A
  { name: "Fatima Musa",        gender: "FEMALE", class: "SS 1", arm: "A", parentEmail: "ibrahim.musa@example.com",   dobYear: 2010 },
  { name: "Abdullahi Musa",     gender: "MALE",   class: "SS 1", arm: "A", parentEmail: "ibrahim.musa@example.com",   dobYear: 2010 },
  { name: "Emmanuel Eze",       gender: "MALE",   class: "SS 1", arm: "A", parentEmail: "eze.family@example.com",     dobYear: 2010 },
  { name: "Chika Obi",          gender: "FEMALE", class: "SS 1", arm: "A", parentEmail: "nnamdi.obi@example.com",     dobYear: 2010 },

  // JSS 3 A
  { name: "Damilola Adesina",   gender: "MALE",   class: "JSS 3", arm: "A", parentEmail: "funmi.adesina@example.com", dobYear: 2011 },
  { name: "Folake Adeyemi",     gender: "FEMALE", class: "JSS 3", arm: "A", parentEmail: "adebola.a@example.com",     dobYear: 2011 },
  { name: "Kelvin Johnson",     gender: "MALE",   class: "JSS 3", arm: "A", parentEmail: "olumide.j@example.com",     dobYear: 2011 },

  // JSS 2 A
  { name: "Tomiwa Johnson",     gender: "MALE",   class: "JSS 2", arm: "A", parentEmail: "olumide.j@example.com",     dobYear: 2012 },
  { name: "Hauwa Musa",         gender: "FEMALE", class: "JSS 2", arm: "A", parentEmail: "ibrahim.musa@example.com",  dobYear: 2012 },
  { name: "Adeola Adesina",     gender: "FEMALE", class: "JSS 2", arm: "A", parentEmail: "funmi.adesina@example.com", dobYear: 2012 },
  { name: "Nnaemeka Eze",       gender: "MALE",   class: "JSS 2", arm: "A", parentEmail: "eze.family@example.com",    dobYear: 2012 },

  // JSS 1 A
  { name: "Chidera Okafor",     gender: "FEMALE", class: "JSS 1", arm: "A", parentEmail: "okafor.family@example.com", dobYear: 2013 },
  { name: "Zainab Bello",       gender: "FEMALE", class: "JSS 1", arm: "A", parentEmail: "parent@meclonescollege.com", dobYear: 2013 },
  { name: "Daniel Obi",         gender: "MALE",   class: "JSS 1", arm: "A", parentEmail: "nnamdi.obi@example.com",    dobYear: 2013 },
  { name: "Joy Adeyemi",        gender: "FEMALE", class: "JSS 1", arm: "A", parentEmail: "adebola.a@example.com",     dobYear: 2013 },

  // JSS 1 B
  { name: "Kingsley Eze",       gender: "MALE",   class: "JSS 1", arm: "B", parentEmail: "eze.family@example.com",    dobYear: 2013 },
  { name: "Tobi Adesina",       gender: "MALE",   class: "JSS 1", arm: "B", parentEmail: "funmi.adesina@example.com", dobYear: 2013 },
  { name: "Esther Musa",        gender: "FEMALE", class: "JSS 1", arm: "B", parentEmail: "ibrahim.musa@example.com",  dobYear: 2013 },
];

// Subjects taught at each level
const SUBJECTS_BY_LEVEL = {
  JSS: ["MTH", "ENG", "BST", "CIV"],
  SSS: ["MTH", "ENG", "BIO", "PHY", "CHM", "CIV"],
};

const FEE_STRUCTURE: Record<string, { feeType: string; amount: number }[]> = {
  JSS: [
    { feeType: "Tuition Fee", amount: 350000 },
    { feeType: "Books & Materials", amount: 45000 },
    { feeType: "PTA Levy", amount: 15000 },
  ],
  SSS: [
    { feeType: "Tuition Fee", amount: 380000 },
    { feeType: "Lab Fee", amount: 45000 },
    { feeType: "Books & Materials", amount: 40000 },
    { feeType: "PTA Levy", amount: 15000 },
  ],
};

const ANNOUNCEMENTS_DATA = [
  { title: "Mid-Term Break", body: "This is to inform all parents and students that the mid-term break begins on Friday, October 23, 2026. School resumes on Tuesday, November 3, 2026. Have a restful break.", audience: "ALL" as const },
  { title: "Extra Lessons — SS3 Classes", body: "Extra coaching classes for SS3 students will hold from Mon-Fri, 4:00pm - 6:00pm. Attendance is compulsory ahead of WAEC mocks.", audience: "ALL" as const },
  { title: "Parents' Meeting", body: "The termly Parents' Meeting is scheduled for Saturday, October 17, 2026 at 10:00 AM in the School Hall. Agenda includes WAEC readiness and 2026/2027 calendar.", audience: "PARENTS" as const },
  { title: "Inter-house Sports", body: "Inter-house sports competition begins Friday, November 13, 2026. All students must be in their house colours. House captains kindly see Mr. Sanwo.", audience: "ALL" as const },
  { title: "WAEC Mock Results", body: "WAEC Mock results are now available on the parent portal. SS3 parents kindly review with your wards and book an academic counselling session if needed.", audience: "PARENTS" as const },
];

const ADMISSIONS_DATA = [
  { name: "Daniel Okonkwo", class: "JSS 1", parentName: "Mr. Stephen Okonkwo", parentPhone: "+2348091112201", parentEmail: "stephen.okonkwo@example.com", previousSchool: "Bright Stars Academy", status: "EXAM_SCHEDULED" as const, daysAgo: 10 },
  { name: "Grace Adewale", class: "JSS 2", parentName: "Mrs. Bola Adewale", parentPhone: "+2348091112202", parentEmail: "bola.adewale@example.com", previousSchool: "Sunbeam Primary", status: "SUBMITTED" as const, daysAgo: 4 },
  { name: "Joshua Ibe", class: "SS 1", parentName: "Mr. Ifeanyi Ibe", parentPhone: "+2348091112203", parentEmail: "ifeanyi.ibe@example.com", previousSchool: "Greenfield High", status: "ADMITTED" as const, daysAgo: 26 },
  { name: "Khadija Lawal", class: "JSS 1", parentName: "Mrs. Hafsat Lawal", parentPhone: "+2348091112204", parentEmail: "hafsat.lawal@example.com", previousSchool: "Crescent Preparatory", status: "UNDER_REVIEW" as const, daysAgo: 3 },
  { name: "Michael Asante", class: "JSS 1", parentName: "Mr. Kofi Asante", parentPhone: "+2348091112205", parentEmail: "kofi.asante@example.com", previousSchool: "Lekki Montessori", status: "SUBMITTED" as const, daysAgo: 2 },
  { name: "Funmi Bakare", class: "SS 2", parentName: "Mrs. Bola Bakare", parentPhone: "+2348091112206", parentEmail: "bola.bakare@example.com", previousSchool: "Lagoon Heights", status: "REJECTED" as const, daysAgo: 18 },
];

// ============================================================
// HELPERS
// ============================================================

const SCHOOL_CODE = (process.env.SCHOOL_CODE ?? "MCL").trim();

function admissionNumberFor(className: string, arm: string, seq: number) {
  // e.g. MCL/JSS1A/2526/001 — prefix swappable via SCHOOL_CODE env var.
  const compact = className.replace(/\s+/g, "") + arm;
  return `${SCHOOL_CODE}/${compact}/2526/${String(seq).padStart(3, "0")}`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function gradeFor(total: number): string {
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}

// Deterministic-ish randomness so reruns produce similar shape but vary numbers
function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log(`Seeding with default password: ${DEFAULT_PASSWORD}`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // ---------- Core staff users ----------
  const staffUsers = [
    { name: "Super Admin", email: "superadmin@meclonescollege.com", role: "SUPER_ADMIN", phone: "+2348030000000" },
    { name: "Mrs. Olufunke Adebayo", email: "director@meclonescollege.com", role: "DIRECTOR", phone: "+2348030000001" },
    { name: "Mr. Kelechi Nnamdi", email: "admin@meclonescollege.com", role: "ADMIN", phone: "+2348030000002" },
    { name: "Mr. Sola Akinwale", email: "accountant@meclonescollege.com", role: "ACCOUNTANT", phone: "+2348030000003" },
  ];
  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, phone: u.phone, role: u.role as never, isActive: true },
      create: { ...u, role: u.role as never, passwordHash, isActive: true },
    });
  }
  console.log(`  ✓ Staff users (${staffUsers.length})`);

  // ---------- Academic session + terms ----------
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
  const firstTerm = await prisma.term.upsert({
    where: { name_sessionId: { name: "FIRST", sessionId: session.id } },
    update: { isActive: true, startDate: new Date("2026-09-01"), endDate: new Date("2026-12-15") },
    create: { name: "FIRST", sessionId: session.id, isActive: true, startDate: new Date("2026-09-01"), endDate: new Date("2026-12-15") },
  });
  for (const t of ["SECOND", "THIRD"] as const) {
    await prisma.term.upsert({
      where: { name_sessionId: { name: t, sessionId: session.id } },
      update: { isActive: false },
      create: { name: t, sessionId: session.id, isActive: false },
    });
  }
  console.log(`  ✓ Session 2026/2027 + 3 terms (FIRST active)`);

  // ---------- Subjects ----------
  const subjectsData = [
    { name: "Mathematics", code: "MTH" },
    { name: "English Language", code: "ENG" },
    { name: "Basic Science & Tech", code: "BST" },
    { name: "Civic Education", code: "CIV" },
    { name: "Biology", code: "BIO" },
    { name: "Physics", code: "PHY" },
    { name: "Chemistry", code: "CHM" },
    { name: "Further Maths", code: "FMTH" },
  ];
  const subjects = await Promise.all(subjectsData.map(s =>
    prisma.subject.upsert({ where: { code: s.code }, update: { name: s.name }, create: s }),
  ));
  const subjectByCode = new Map(subjects.map(s => [s.code, s]));
  console.log(`  ✓ Subjects (${subjects.length})`);

  // ---------- Classes ----------
  const classesData = [
    { name: "JSS 1", arm: "A", level: "JSS" as const },
    { name: "JSS 1", arm: "B", level: "JSS" as const },
    { name: "JSS 2", arm: "A", level: "JSS" as const },
    { name: "JSS 3", arm: "A", level: "JSS" as const },
    { name: "SS 1", arm: "A", level: "SSS" as const },
    { name: "SS 2", arm: "A", level: "SSS" as const },
    { name: "SS 3", arm: "A", level: "SSS" as const },
  ];
  const classes = await Promise.all(classesData.map(c =>
    prisma.class.upsert({
      where: { name_arm: { name: c.name, arm: c.arm } },
      update: { level: c.level },
      create: c,
    }),
  ));
  const classByKey = new Map(classes.map(c => [`${c.name}|${c.arm}`, c]));
  console.log(`  ✓ Classes (${classes.length})`);

  // ClassSubject links — JSS subjects to JSS classes, SS subjects to SS classes
  for (const c of classes) {
    const subjectCodes = SUBJECTS_BY_LEVEL[c.level];
    for (const code of subjectCodes) {
      const subj = subjectByCode.get(code);
      if (!subj) continue;
      await prisma.classSubject.upsert({
        where: { classId_subjectId: { classId: c.id, subjectId: subj.id } },
        update: {},
        create: { classId: c.id, subjectId: subj.id },
      });
    }
  }

  // ---------- Teachers (each with linked User) ----------
  for (const t of TEACHERS_DATA) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, phone: t.phone, role: "TEACHER" as never, isActive: true },
      create: { name: t.name, email: t.email, phone: t.phone, role: "TEACHER" as never, passwordHash, isActive: true },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: { bio: t.bio },
      create: { userId: user.id, bio: t.bio },
    });

    // Subject assignments
    for (const code of t.subjects) {
      const subj = subjectByCode.get(code);
      if (!subj) continue;
      await prisma.subjectTeacher.upsert({
        where: { teacherId_subjectId: { teacherId: teacher.id, subjectId: subj.id } },
        update: {},
        create: { teacherId: teacher.id, subjectId: subj.id },
      });
    }

    // Form teacher of...
    if (t.formTeacherOf) {
      const cls = classByKey.get(`${t.formTeacherOf.name}|${t.formTeacherOf.arm}`);
      if (cls) {
        await prisma.class.update({ where: { id: cls.id }, data: { classTeacherId: teacher.id } });
        // also class-teacher assignment
        await prisma.classTeacher.upsert({
          where: { teacherId_classId: { teacherId: teacher.id, classId: cls.id } },
          update: {},
          create: { teacherId: teacher.id, classId: cls.id },
        });
      }
    }
  }
  console.log(`  ✓ Teachers (${TEACHERS_DATA.length}) + subject/class assignments`);

  // ---------- Parents (each with linked User + Parent row) ----------
  const parentRecords = new Map<string, { parentId: string; userId: string }>();
  for (const p of PARENTS_DATA) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, phone: p.phone, role: "PARENT" as never, isActive: true },
      create: { name: p.name, email: p.email, phone: p.phone, role: "PARENT" as never, passwordHash, isActive: true },
    });
    const parent = await prisma.parent.upsert({
      where: { userId: user.id },
      update: { whatsappOptIn: true },
      create: { userId: user.id, whatsappOptIn: true },
    });
    parentRecords.set(p.email, { parentId: parent.id, userId: user.id });
  }
  console.log(`  ✓ Parents (${PARENTS_DATA.length})`);

  // ---------- Students ----------
  const seqByClass = new Map<string, number>();
  const createdStudents: { id: string; classId: string; level: "JSS" | "SSS" }[] = [];

  // Ensure the demo student@ user maps to Yusuf Bello and admission MCL/SS3A/2526/001.
  for (let i = 0; i < STUDENTS_DATA.length; i++) {
    const s = STUDENTS_DATA[i];
    const cls = classByKey.get(`${s.class}|${s.arm}`)!;
    const key = `${s.class}|${s.arm}`;
    const seq = (seqByClass.get(key) ?? 0) + 1;
    seqByClass.set(key, seq);
    const admissionNumber = admissionNumberFor(s.class, s.arm, seq);

    // First Yusuf Bello in SS3A maps to the canonical student@ login.
    const isDemoStudent = s.name === "Yusuf Bello" && s.class === "SS 3" && s.arm === "A";
    const email = isDemoStudent ? "student@meclonescollege.com" : `student.${admissionNumber.replace(/[^a-z0-9]/gi, "").toLowerCase()}@meclones.local`;

    const user = await prisma.user.upsert({
      where: { email },
      update: { name: s.name, role: "STUDENT" as never, isActive: true },
      create: { name: s.name, email, role: "STUDENT" as never, passwordHash, isActive: true },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { admissionNumber, classId: cls.id, gender: s.gender, dob: new Date(`${s.dobYear}-06-15`) },
      create: {
        admissionNumber,
        userId: user.id,
        classId: cls.id,
        gender: s.gender,
        dob: new Date(`${s.dobYear}-06-15`),
      },
    });

    createdStudents.push({ id: student.id, classId: cls.id, level: cls.level });

    // Link to parent.
    const parent = parentRecords.get(s.parentEmail);
    if (parent) {
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.parentId, studentId: student.id } },
        update: {},
        create: { parentId: parent.parentId, studentId: student.id, relation: "Parent" },
      });
    }
  }
  console.log(`  ✓ Students (${createdStudents.length}) + parent links`);

  // ---------- Attendance (last 10 school days, weekdays only) ----------
  console.log("  · seeding attendance...");
  const today = new Date();
  const attendanceDates: Date[] = [];
  let cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (attendanceDates.length < 10) {
    cursor.setDate(cursor.getDate() - 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) attendanceDates.push(new Date(cursor));
  }

  // Wipe + reseed attendance to keep numbers stable across reruns.
  await prisma.attendance.deleteMany({
    where: { studentId: { in: createdStudents.map(s => s.id) } },
  });

  const attRows: Prisma.AttendanceCreateManyInput[] = [];
  for (const stu of createdStudents) {
    for (let di = 0; di < attendanceDates.length; di++) {
      const date = attendanceDates[di];
      const r = rand(stu.id.charCodeAt(0) + stu.id.charCodeAt(stu.id.length - 1) + di);
      const status: "PRESENT" | "ABSENT" | "LATE" = r > 0.92 ? "ABSENT" : r > 0.85 ? "LATE" : "PRESENT";
      attRows.push({
        studentId: stu.id,
        classId: stu.classId,
        termId: firstTerm.id,
        date,
        status,
      });
    }
  }
  await prisma.attendance.createMany({ data: attRows, skipDuplicates: true });
  console.log(`  ✓ Attendance rows (${attRows.length})`);

  // ---------- Results (current term, all subjects per class, ~70% published) ----------
  console.log("  · seeding results...");
  await prisma.result.deleteMany({
    where: { studentId: { in: createdStudents.map(s => s.id) } },
  });

  const resultRows: Prisma.ResultCreateManyInput[] = [];
  for (const stu of createdStudents) {
    const subjectCodes = SUBJECTS_BY_LEVEL[stu.level];
    for (let si = 0; si < subjectCodes.length; si++) {
      const subj = subjectByCode.get(subjectCodes[si])!;
      const baseSeed = stu.id.charCodeAt(0) + si * 31;
      // Most students 55-85, a few outliers either side.
      const ca1 = Math.min(20, Math.max(8, Math.round(rand(baseSeed) * 12 + 8)));
      const ca2 = Math.min(20, Math.max(8, Math.round(rand(baseSeed + 1) * 12 + 8)));
      const exam = Math.min(60, Math.max(25, Math.round(rand(baseSeed + 2) * 30 + 28)));
      const total = ca1 + ca2 + exam;
      resultRows.push({
        studentId: stu.id,
        subjectId: subj.id,
        termId: firstTerm.id,
        sessionId: session.id,
        ca1, ca2, exam, total,
        grade: gradeFor(total),
        isPublished: rand(baseSeed + 3) > 0.3, // ~70% published
      });
    }
  }
  await prisma.result.createMany({ data: resultRows, skipDuplicates: true });
  console.log(`  ✓ Results rows (${resultRows.length})`);

  // Compute positions per class+subject+term for the published rows.
  // (Simple ranking by total within each class for the term.)
  for (const cls of classes) {
    const studentIds = createdStudents.filter(s => s.classId === cls.id).map(s => s.id);
    if (studentIds.length === 0) continue;
    const totals = await prisma.result.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, termId: firstTerm.id, isPublished: true },
      _sum: { total: true },
    });
    const ranked = totals
      .map(t => ({ studentId: t.studentId, sum: Number(t._sum.total ?? 0) }))
      .sort((a, b) => b.sum - a.sum);
    for (let i = 0; i < ranked.length; i++) {
      await prisma.result.updateMany({
        where: { studentId: ranked[i].studentId, termId: firstTerm.id, isPublished: true },
        data: { position: i + 1 },
      });
    }
  }
  console.log("  ✓ Result positions computed");

  // ---------- Fees (current term, per student) ----------
  console.log("  · seeding fees...");
  await prisma.fee.deleteMany({
    where: { studentId: { in: createdStudents.map(s => s.id) } },
  });

  const feeRows: Prisma.FeeCreateManyInput[] = [];
  for (const stu of createdStudents) {
    const structure = FEE_STRUCTURE[stu.level];
    const r = rand(stu.id.charCodeAt(stu.id.length - 1));
    // 50% paid, 30% partial, 20% unpaid
    const payMode: "PAID" | "PARTIAL" | "UNPAID" = r > 0.8 ? "UNPAID" : r > 0.5 ? "PARTIAL" : "PAID";
    for (const line of structure) {
      let paid: number;
      if (payMode === "PAID") paid = line.amount;
      else if (payMode === "PARTIAL") paid = Math.round(line.amount * 0.6);
      else paid = 0;
      const balance = line.amount - paid;
      feeRows.push({
        studentId: stu.id,
        termId: firstTerm.id,
        sessionId: session.id,
        feeType: line.feeType,
        amount: new Prisma.Decimal(line.amount),
        amountPaid: new Prisma.Decimal(paid),
        balance: new Prisma.Decimal(balance),
        status: balance === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
        dueDate: new Date("2026-10-15"),
      });
    }
  }
  await prisma.fee.createMany({ data: feeRows, skipDuplicates: true });
  console.log(`  ✓ Fees rows (${feeRows.length})`);

  // ---------- Announcements ----------
  await prisma.announcement.deleteMany({});
  const directorUser = await prisma.user.findUnique({ where: { email: "director@meclonescollege.com" } });
  for (let i = 0; i < ANNOUNCEMENTS_DATA.length; i++) {
    const a = ANNOUNCEMENTS_DATA[i];
    await prisma.announcement.create({
      data: {
        title: a.title,
        body: a.body,
        audience: a.audience,
        authorId: directorUser?.id ?? null,
        publishedAt: daysAgo(i + 1),
      },
    });
  }
  console.log(`  ✓ Announcements (${ANNOUNCEMENTS_DATA.length})`);

  // ---------- Admissions (sample queue) ----------
  // Don't wipe — keep any real admissions from the public site. Just ensure the
  // seed examples exist (idempotent by reference number).
  for (let i = 0; i < ADMISSIONS_DATA.length; i++) {
    const a = ADMISSIONS_DATA[i];
    const reference = `MEC/SEED/${String(i + 1).padStart(4, "0")}`;
    await prisma.admission.upsert({
      where: { reference },
      update: {
        applicantName: a.name,
        classApplyingFor: a.class,
        parentName: a.parentName,
        parentPhone: a.parentPhone,
        parentEmail: a.parentEmail,
        previousSchool: a.previousSchool,
        status: a.status,
      },
      create: {
        reference,
        applicantName: a.name,
        classApplyingFor: a.class,
        parentName: a.parentName,
        parentPhone: a.parentPhone,
        parentEmail: a.parentEmail,
        previousSchool: a.previousSchool,
        status: a.status,
        createdAt: daysAgo(a.daysAgo),
      },
    });
  }
  console.log(`  ✓ Admissions (${ADMISSIONS_DATA.length} sample)`);

  console.log("\nDone.\n");
  console.log(`Demo password for ALL users: ${DEFAULT_PASSWORD}`);
  console.log("Demo logins:");
  console.log(`  SUPER_ADMIN   superadmin@meclonescollege.com`);
  console.log(`  DIRECTOR      director@meclonescollege.com`);
  console.log(`  ADMIN         admin@meclonescollege.com`);
  console.log(`  ACCOUNTANT    accountant@meclonescollege.com`);
  console.log(`  TEACHER       teacher@meclonescollege.com  (Mrs. Adaeze Obi, JSS 1A form teacher)`);
  console.log(`  STUDENT       student@meclonescollege.com  (Yusuf Bello, SS 3A)`);
  console.log(`  PARENT        parent@meclonescollege.com   (Dr. Aisha Bello — 3 children)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
