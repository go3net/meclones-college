"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

const BLOOD_GROUPS = [
  "A_POSITIVE", "A_NEGATIVE",
  "B_POSITIVE", "B_NEGATIVE",
  "AB_POSITIVE", "AB_NEGATIVE",
  "O_POSITIVE", "O_NEGATIVE",
  "UNKNOWN",
] as const;

const GENOTYPES = ["AA", "AS", "AC", "SS", "SC", "CC", "UNKNOWN"] as const;

const schema = z.object({
  studentId: z.string().min(1),
  bloodGroup: z.enum(BLOOD_GROUPS).default("UNKNOWN"),
  genotype: z.enum(GENOTYPES).default("UNKNOWN"),
  allergies: z.string().max(2000).optional(),
  chronicConditions: z.string().max(2000).optional(),
  currentMedications: z.string().max(2000).optional(),
  immunisationNotes: z.string().max(2000).optional(),
  dietaryRestrictions: z.string().max(1000).optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(40).optional(),
  emergencyContactRelation: z.string().max(60).optional(),
  doctorName: z.string().max(120).optional(),
  doctorPhone: z.string().max(40).optional(),
  preferredHospital: z.string().max(200).optional(),
  insuranceProvider: z.string().max(200).optional(),
  insurancePolicyNumber: z.string().max(120).optional(),
  lastCheckup: z.string().optional(),
  notes: z.string().max(4000).optional(),
});

function parseNum(v: string | undefined) {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function nullable(v: string | undefined) {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function saveHealthRecord(formData: FormData) {
  const user = await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const err = parsed.error.issues[0]?.message ?? "Invalid input";
    const id = String(formData.get("studentId") ?? "");
    redirect(`/portal/admin/students/${id}/health?error=${encodeURIComponent(err)}`);
  }
  const d = parsed.data;

  // Sanity: student must exist.
  const student = await prisma.student.findUnique({
    where: { id: d.studentId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!student) {
    redirect(`/portal/admin/students?error=${encodeURIComponent("Student not found")}`);
  }

  const lastCheckup = d.lastCheckup ? new Date(d.lastCheckup) : null;

  const payload = {
    bloodGroup: d.bloodGroup,
    genotype: d.genotype,
    allergies: nullable(d.allergies),
    chronicConditions: nullable(d.chronicConditions),
    currentMedications: nullable(d.currentMedications),
    immunisationNotes: nullable(d.immunisationNotes),
    dietaryRestrictions: nullable(d.dietaryRestrictions),
    heightCm: parseNum(d.heightCm),
    weightKg: parseNum(d.weightKg),
    emergencyContactName: nullable(d.emergencyContactName),
    emergencyContactPhone: nullable(d.emergencyContactPhone),
    emergencyContactRelation: nullable(d.emergencyContactRelation),
    doctorName: nullable(d.doctorName),
    doctorPhone: nullable(d.doctorPhone),
    preferredHospital: nullable(d.preferredHospital),
    insuranceProvider: nullable(d.insuranceProvider),
    insurancePolicyNumber: nullable(d.insurancePolicyNumber),
    lastCheckup,
    notes: nullable(d.notes),
    lastUpdatedBy: user.name,
    lastUpdatedById: user.id,
  };

  const existing = await prisma.healthRecord.findUnique({ where: { studentId: d.studentId } });

  await prisma.healthRecord.upsert({
    where: { studentId: d.studentId },
    update: payload,
    create: { studentId: d.studentId, ...payload },
  });

  await auditLog({
    action: existing ? "student.health.update" : "student.health.create",
    targetType: "Student",
    targetId: d.studentId,
    metadata: {
      studentName: student!.user.name,
      bloodGroup: d.bloodGroup,
      genotype: d.genotype,
    },
  });

  revalidatePath(`/portal/admin/students/${d.studentId}`);
  revalidatePath(`/portal/admin/students/${d.studentId}/health`);
  redirect(`/portal/admin/students/${d.studentId}/health?saved=1`);
}
