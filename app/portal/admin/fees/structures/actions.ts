"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const LineItemSchema = z.object({ feeType: z.string().min(1), amount: z.coerce.number().min(0) });
const StructureSchema = z.object({
  name: z.string().min(2),
  level: z.enum(["JSS", "SSS", ""]).optional(),
  items: z.array(LineItemSchema).min(1, "Add at least one line item"),
});

/**
 * Form payload encodes line items as `feeType[]` + `amount[]` arrays.
 * We zip them into pairs.
 */
function readLineItems(formData: FormData) {
  const feeTypes = formData.getAll("feeType").map(v => String(v).trim());
  const amounts = formData.getAll("amount").map(v => String(v).trim());
  const out: { feeType: string; amount: number }[] = [];
  for (let i = 0; i < feeTypes.length; i++) {
    const t = feeTypes[i];
    const a = Number(amounts[i] ?? 0);
    if (t && a >= 0) out.push({ feeType: t, amount: a });
  }
  return out;
}

export async function createFeeStructure(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = StructureSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    level: (formData.get("level") || "") as string,
    items: readLineItems(formData),
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/fees/structures?error=${encodeURIComponent(msg)}`);
  }

  await prisma.feeStructure.create({
    data: {
      name: parsed.data.name,
      level: parsed.data.level ? (parsed.data.level as "JSS" | "SSS") : null,
      items: parsed.data.items as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/portal/admin/fees/structures");
  redirect(`/portal/admin/fees/structures?created=${encodeURIComponent(parsed.data.name)}`);
}

export async function deleteFeeStructure(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await prisma.feeStructure.delete({ where: { id } });
  revalidatePath("/portal/admin/fees/structures");
}

const ApplySchema = z.object({
  structureId: z.string().min(1),
  classId: z.string().min(1),
  dueDate: z.string().optional(),
});

/**
 * Apply a fee structure to every student in a class, for the active term.
 * Upserts per (student, term, feeType) — re-running preserves prior payments
 * but updates the amount if it has changed.
 */
export async function applyFeeStructure(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parsed = ApplySchema.safeParse({
    structureId: formData.get("structureId"),
    classId: formData.get("classId"),
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) redirect(`/portal/admin/fees/structures?error=${encodeURIComponent("Invalid")}`);
  const d = parsed.data;

  const [structure, session, term, students] = await Promise.all([
    prisma.feeStructure.findUnique({ where: { id: d.structureId } }),
    prisma.academicSession.findFirst({ where: { isActive: true } }),
    prisma.term.findFirst({ where: { isActive: true } }),
    prisma.student.findMany({ where: { classId: d.classId }, select: { id: true } }),
  ]);
  if (!structure) redirect(`/portal/admin/fees/structures?error=${encodeURIComponent("Structure not found")}`);
  if (!session || !term) redirect(`/portal/admin/fees/structures?error=${encodeURIComponent("No active term")}`);
  if (students.length === 0) redirect(`/portal/admin/fees/structures?error=${encodeURIComponent("No students in that class")}`);

  const items = (structure.items as unknown as { feeType: string; amount: number }[]);
  const dueDate = d.dueDate ? new Date(d.dueDate) : null;
  let rowsCreated = 0;
  let rowsUpdated = 0;

  for (const stu of students) {
    for (const item of items) {
      const amount = new Prisma.Decimal(item.amount);
      const existing = await prisma.fee.findFirst({
        where: { studentId: stu.id, termId: term.id, feeType: item.feeType },
      });
      if (existing) {
        const balance = amount.minus(existing.amountPaid);
        await prisma.fee.update({
          where: { id: existing.id },
          data: {
            amount,
            balance: balance.lt(0) ? new Prisma.Decimal(0) : balance,
            status: balance.lte(0) ? "PAID" : existing.amountPaid.gt(0) ? "PARTIAL" : "UNPAID",
            dueDate,
          },
        });
        rowsUpdated++;
      } else {
        await prisma.fee.create({
          data: {
            studentId: stu.id,
            termId: term.id,
            sessionId: session.id,
            feeType: item.feeType,
            amount,
            amountPaid: new Prisma.Decimal(0),
            balance: amount,
            status: "UNPAID",
            dueDate,
          },
        });
        rowsCreated++;
      }
    }
  }

  revalidatePath("/portal/admin/fees");
  revalidatePath("/portal/parent/fees");
  revalidatePath("/portal/student/fees");
  redirect(`/portal/admin/fees/structures?applied=${rowsCreated}+${rowsUpdated}`);
}
