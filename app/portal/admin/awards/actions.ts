"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

const AwardSchema = z.object({
  studentId: z.string().min(1),
  category: z.enum(["ACADEMIC_EXCELLENCE", "ATTENDANCE", "CONDUCT", "LEADERSHIP", "SPORTSMANSHIP", "COMMUNITY_SERVICE", "ARTS", "IMPROVEMENT", "PERFECT_ATTENDANCE", "OTHER"]),
  title: z.string().min(2),
  citation: z.string().optional(),
  stars: z.coerce.number().int().min(1).max(5).default(5),
});

export async function nominateAward(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN", "TEACHER"]);
  const user = await getSessionUser();

  const parsed = AwardSchema.safeParse({
    studentId: formData.get("studentId"),
    category: formData.get("category"),
    title: String(formData.get("title") ?? "").trim(),
    citation: formData.get("citation") || undefined,
    stars: formData.get("stars") || 5,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/awards?error=${encodeURIComponent(msg)}`);
  }
  const d = parsed.data;

  const [session, term] = await Promise.all([
    prisma.academicSession.findFirst({ where: { isActive: true } }),
    prisma.term.findFirst({ where: { isActive: true } }),
  ]);

  await prisma.award.create({
    data: {
      studentId: d.studentId,
      category: d.category,
      title: d.title,
      citation: d.citation || null,
      stars: d.stars,
      termId: term?.id ?? null,
      sessionId: session?.id ?? null,
      awardedById: user?.id ?? null,
    },
  });

  revalidatePath("/portal/admin/awards");
  revalidatePath(`/portal/admin/students/${d.studentId}`);
  redirect(`/portal/admin/awards?created=1`);
}

export async function deleteAward(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await prisma.award.delete({ where: { id } });
  revalidatePath("/portal/admin/awards");
}
