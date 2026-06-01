"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

const BrandSchema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  logoSquareUrl: z.string().optional().or(z.literal("")),
  primaryHex: z.string().optional().or(z.literal("")),
  accentHex: z.string().optional().or(z.literal("")),
});

function normaliseHex(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim();
  if (!t) return null;
  if (!HEX_RE.test(t)) return null;
  return t.startsWith("#") ? t.toLowerCase() : `#${t.toLowerCase()}`;
}

export async function saveBrand(formData: FormData) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const parsed = BrandSchema.safeParse({
    logoUrl: formData.get("logoUrl"),
    logoSquareUrl: formData.get("logoSquareUrl"),
    primaryHex: formData.get("primaryHex"),
    accentHex: formData.get("accentHex"),
  });
  if (!parsed.success) {
    redirect("/portal/director/branding?error=" + encodeURIComponent("Invalid input"));
  }
  const d = parsed.data;

  const data = {
    logoUrl: (d.logoUrl ?? "").trim() || null,
    logoSquareUrl: (d.logoSquareUrl ?? "").trim() || null,
    primaryHex: normaliseHex(d.primaryHex),
    accentHex: normaliseHex(d.accentHex),
  };

  await prisma.schoolBrand.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });

  auditLog({
    action: "brand.update",
    metadata: { primaryHex: data.primaryHex, accentHex: data.accentHex, hasLogo: Boolean(data.logoUrl) },
  });

  revalidatePath("/portal/director/branding");
  revalidatePath("/portal");
  redirect("/portal/director/branding?saved=1");
}

export async function clearBrand() {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  await prisma.schoolBrand.deleteMany({ where: { id: "default" } });
  auditLog({ action: "brand.clear" });
  revalidatePath("/portal/director/branding");
  redirect("/portal/director/branding?cleared=1");
}
