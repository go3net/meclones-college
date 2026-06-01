"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

const CreateSchema = z.object({
  code: z.string().min(2).max(8).regex(/^[A-Za-z0-9_-]+$/, "Letters, numbers, _ or - only"),
  name: z.string().min(2).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

export async function createBranch(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const parsed = CreateSchema.safeParse({
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim().toLowerCase() || undefined,
  });
  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Invalid";
    redirect(`/portal/admin/branches?error=${encodeURIComponent(msg)}`);
  }

  const exists = await prisma.branch.findUnique({ where: { code: parsed.data.code } });
  if (exists) {
    redirect(`/portal/admin/branches?error=${encodeURIComponent("That code is already in use.")}`);
  }

  const created = await prisma.branch.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      isMain: false,
      isActive: true,
    },
  });

  auditLog({
    action: "branch.create",
    targetType: "Branch",
    targetId: created.id,
    metadata: { code: created.code, name: created.name },
  });

  revalidatePath("/portal/admin/branches");
  redirect(`/portal/admin/branches?added=${encodeURIComponent(created.name)}`);
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

export async function updateBranch(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    name: String(formData.get("name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim().toLowerCase() || undefined,
  });
  if (!parsed.success) {
    redirect(`/portal/admin/branches?error=${encodeURIComponent("Invalid input")}`);
  }

  await prisma.branch.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    },
  });

  auditLog({ action: "branch.update", targetType: "Branch", targetId: parsed.data.id });
  revalidatePath("/portal/admin/branches");
  redirect(`/portal/admin/branches?saved=1`);
}

export async function toggleBranchActive(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/portal/admin/branches");

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) redirect("/portal/admin/branches?error=" + encodeURIComponent("Branch not found"));

  if (branch!.isMain && branch!.isActive) {
    redirect("/portal/admin/branches?error=" + encodeURIComponent("You can't deactivate the Main branch."));
  }

  await prisma.branch.update({
    where: { id },
    data: { isActive: !branch!.isActive },
  });

  auditLog({
    action: branch!.isActive ? "branch.deactivate" : "branch.activate",
    targetType: "Branch",
    targetId: id,
  });

  revalidatePath("/portal/admin/branches");
  redirect("/portal/admin/branches?toggled=1");
}

/** Sets the active-branch cookie (used by the BranchSwitcher). */
export async function setActiveBranch(formData: FormData) {
  const id = String(formData.get("branchId") ?? "").trim();
  const value = id === "ALL" ? "ALL" : id;
  cookies().set({
    name: "branch",
    value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    path: "/",
  });
  // Redirect back to wherever they came from (best-effort).
  const back = String(formData.get("return") ?? "/portal/admin");
  redirect(back);
}
