"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

const Schema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  body: z.string().min(10, "Please describe the issue (10+ chars)"),
  category: z.enum(["ACADEMIC", "FEES", "STAFF", "FACILITY", "TRANSPORT", "GENERAL", "OTHER"]).default("GENERAL"),
});

export async function submitComplaint(formData: FormData) {
  await requireRole("PARENT");
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const parsed = Schema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
    category: formData.get("category") ?? "GENERAL",
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg = Object.values(flat.fieldErrors).flat()[0] ?? "Invalid input";
    redirect(`/portal/parent/complaints/new?error=${encodeURIComponent(msg)}`);
  }

  // Look up user phone for the snapshot
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } });

  await prisma.complaint.create({
    data: {
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      authorId: user.id,
      authorName: u?.name ?? user.name,
      authorEmail: u?.email ?? user.email,
      authorPhone: u?.phone ?? null,
    },
  });

  revalidatePath("/portal/parent/complaints");
  revalidatePath("/portal/admin/complaints");
  redirect("/portal/parent/complaints?submitted=1");
}
