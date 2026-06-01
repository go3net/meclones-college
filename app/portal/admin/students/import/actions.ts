"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { createResetToken } from "@/lib/password-reset";
import { sendWelcomeEmail } from "@/lib/resend";
import { SCHOOL, SCHOOL_CODE } from "@/lib/constants";

const DEFAULT_PASSWORD = process.env.SEED_PASSWORD ?? "Meclones123!";

interface ImportRow {
  firstName: string;
  lastName: string;
  gender?: "MALE" | "FEMALE";
  dob?: string;
  className?: string;
  classArm?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  parentRelation?: string;
}

interface ImportResult {
  ok: number;
  errors: { row: number; reason: string }[];
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);
}

/**
 * Parse a minimally-permissive CSV — quoted strings + commas. Good enough
 * for school spreadsheets exported from Excel/Numbers. Skip totally blank
 * lines so trailing newlines don't blow up the count.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === "\"") {
        if (text[i + 1] === "\"") { field += "\""; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === "\"") inQuotes = true;
      else if (ch === ",") { cur.push(field); field = ""; }
      else if (ch === "\n") {
        cur.push(field); field = "";
        if (cur.some(c => c.trim())) rows.push(cur);
        cur = [];
      } else if (ch !== "\r") field += ch;
    }
  }
  cur.push(field);
  if (cur.some(c => c.trim())) rows.push(cur);
  return rows;
}

export async function importStudentsCsv(formData: FormData): Promise<void> {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    redirect("/portal/admin/students/import?error=no-file");
  }
  if (file.size > 1024 * 1024) {
    redirect("/portal/admin/students/import?error=" + encodeURIComponent("File too large (max 1 MB)"));
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    redirect("/portal/admin/students/import?error=" + encodeURIComponent("CSV must include a header row and at least one student"));
  }

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const col = (name: string) => headers.indexOf(name.toLowerCase());

  const COLS = {
    firstName: col("firstname"),
    lastName: col("lastname"),
    gender: col("gender"),
    dob: col("dob"),
    className: col("class"),
    classArm: col("arm"),
    parentName: col("parentname"),
    parentEmail: col("parentemail"),
    parentPhone: col("parentphone"),
    parentRelation: col("parentrelation"),
  };

  if (COLS.firstName < 0 || COLS.lastName < 0 || COLS.className < 0 || COLS.classArm < 0) {
    redirect("/portal/admin/students/import?error=" + encodeURIComponent("CSV missing required columns: firstName, lastName, class, arm"));
  }

  const classes = await prisma.class.findMany();
  const classByKey = new Map(classes.map(c => [`${c.name.toLowerCase()}|${c.arm.toLowerCase()}`, c]));
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const result: ImportResult = { ok: 0, errors: [] };

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");
    const data: ImportRow = {
      firstName: get(COLS.firstName),
      lastName: get(COLS.lastName),
      gender: ((g: string) => g === "M" || g.toUpperCase() === "MALE" ? "MALE" : g === "F" || g.toUpperCase() === "FEMALE" ? "FEMALE" : undefined)(get(COLS.gender)),
      dob: get(COLS.dob) || undefined,
      className: get(COLS.className),
      classArm: get(COLS.classArm),
      parentName: get(COLS.parentName),
      parentEmail: get(COLS.parentEmail).toLowerCase(),
      parentPhone: get(COLS.parentPhone),
      parentRelation: get(COLS.parentRelation),
    };

    try {
      if (!data.firstName || !data.lastName) throw new Error("Missing first/last name");
      const cls = classByKey.get(`${data.className?.toLowerCase()}|${data.classArm?.toLowerCase()}`);
      if (!cls) throw new Error(`Class "${data.className} ${data.classArm}" not found`);

      const fullName = `${data.firstName} ${data.lastName}`;
      const prefix = `${SCHOOL_CODE}/${cls.name.replace(/\s+/g, "")}${cls.arm}/2526/`;
      const existingCount = await prisma.student.count({ where: { admissionNumber: { startsWith: prefix } } });
      const admissionNumber = `${prefix}${String(existingCount + 1).padStart(3, "0")}`;
      const studentEmail = `student.${slugify(admissionNumber)}@meclones.local`;

      const stuUser = await prisma.user.upsert({
        where: { email: studentEmail },
        update: { name: fullName, role: "STUDENT" as never, isActive: true },
        create: {
          name: fullName,
          email: studentEmail,
          role: "STUDENT" as never,
          passwordHash,
          isActive: true,
        },
      });

      const student = await prisma.student.upsert({
        where: { userId: stuUser.id },
        update: { admissionNumber, classId: cls.id, gender: data.gender, dob: data.dob ? new Date(data.dob) : null },
        create: {
          admissionNumber,
          userId: stuUser.id,
          classId: cls.id,
          gender: data.gender,
          dob: data.dob ? new Date(data.dob) : null,
        },
      });

      let newParentToWelcome: { email: string; name: string; admissionNumber: string; className: string } | null = null;

      if (data.parentEmail && data.parentName) {
        const existingParentUser = await prisma.user.findUnique({ where: { email: data.parentEmail }, select: { id: true } });
        const wasNewParentUser = !existingParentUser;

        const parentUser = await prisma.user.upsert({
          where: { email: data.parentEmail },
          update: { name: data.parentName, phone: data.parentPhone || null, role: "PARENT" as never, isActive: true },
          create: {
            name: data.parentName,
            email: data.parentEmail,
            phone: data.parentPhone || null,
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
          update: { relation: data.parentRelation || "Parent" },
          create: { parentId: parent.id, studentId: student.id, relation: data.parentRelation || "Parent" },
        });

        if (wasNewParentUser) {
          newParentToWelcome = {
            email: data.parentEmail,
            name: data.parentName,
            admissionNumber,
            className: `${cls.name}${cls.arm}`,
          };
        }
      }

      // Fire-and-forget welcome email for every parent we just created.
      // Awaiting inside the loop would slow large imports + risk Resend
      // rate-limits stalling the whole job.
      if (newParentToWelcome) {
        const target = newParentToWelcome;
        const studentName = fullName;
        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
        createResetToken(target.email, { ttlHours: 24 * 7 })
          .then(token => sendWelcomeEmail({
            to: target.email,
            recipientName: target.name,
            role: "PARENT",
            loginEmail: target.email,
            setPasswordUrl: `${siteUrl}/portal/reset-password/${token}`,
            loginUrl: `${siteUrl}/portal/login`,
            children: [{ name: studentName, admissionNumber: target.admissionNumber, className: target.className }],
          }))
          .catch(err => console.error("[students/import] welcome email failed", target.email, err));
      }

      result.ok++;
    } catch (err) {
      result.errors.push({ row: r + 1, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  auditLog({
    action: "student.bulk_import",
    targetType: "Import",
    metadata: { ok: result.ok, errors: result.errors.length, fileName: (file as File).name },
  });

  revalidatePath("/portal/admin/students");
  redirect(`/portal/admin/students/import?ok=${result.ok}&err=${result.errors.length}${result.errors.length > 0 ? `&firstErr=${encodeURIComponent(result.errors[0].reason)}` : ""}`);
}
