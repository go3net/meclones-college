"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { School } from "@prisma/client";
import { prisma, prismaBase } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { runAsSchool } from "@/lib/tenant-context";
import { invalidateHostCache } from "@/lib/host";
import { encrypt, isEncryptionConfigured } from "@/lib/crypto";
import { toPublicSchool } from "@/lib/school-public";
import { defaultKnowledgeSections } from "@/lib/school-knowledge";
import { TENANT_MODELS } from "@/lib/prisma-tenant-extension";

// ─── Validation ─────────────────────────────────────────────────────

const RESERVED_SLUGS = new Set([
  "www", "api", "app", "admin", "portal", "mail", "smtp", "ftp", "static", "assets", "cdn",
  "status", "help", "support", "docs", "blog", "dev", "staging", "test", "demo", "platform",
]);

const blank = z.literal("").transform(() => undefined);
const opt = (max: number) => z.string().trim().max(max).optional().or(blank);

const IdentitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  shortName: z.string().trim().min(2).max(60),
  tagline: opt(160),
  address: opt(300),
  addressShort: opt(160),
  phone: opt(40),
  phoneIntl: opt(40),
  email: z.string().trim().email().max(120).optional().or(blank),
  admissionsEmail: z.string().trim().email().max(120).optional().or(blank),
  whatsapp: opt(40),
  hours: opt(80),
  website: z.string().trim().url().max(200).optional().or(blank),
  customDomain: z
    .string().trim().toLowerCase().max(120)
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter a bare domain like school.com")
    .optional().or(blank),
  publicSiteEnabled: z.boolean(),
});

const CreateSchema = IdentitySchema.extend({
  slug: z
    .string().trim().toLowerCase().min(3).max(40)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/, "Lowercase letters, numbers and hyphens")
    .refine(s => !RESERVED_SLUGS.has(s), "That slug is reserved"),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,4}$/, "2-4 uppercase letters/digits"),
  adminName: z.string().trim().min(2).max(120),
  adminEmail: z.string().trim().toLowerCase().email().max(120),
  adminPassword: z.string().min(8).max(128),
});

function field(fd: FormData, name: string): string {
  return String(fd.get(name) ?? "").trim();
}

function identityFrom(fd: FormData) {
  return {
    name: field(fd, "name"),
    shortName: field(fd, "shortName"),
    tagline: field(fd, "tagline"),
    address: field(fd, "address"),
    addressShort: field(fd, "addressShort"),
    phone: field(fd, "phone"),
    phoneIntl: field(fd, "phoneIntl"),
    email: field(fd, "email").toLowerCase(),
    admissionsEmail: field(fd, "admissionsEmail").toLowerCase(),
    whatsapp: field(fd, "whatsapp"),
    hours: field(fd, "hours"),
    website: field(fd, "website"),
    customDomain: field(fd, "customDomain").toLowerCase(),
    publicSiteEnabled: fd.get("publicSiteEnabled") === "on",
  };
}

function firstError(err: z.ZodError): string {
  const flat = err.flatten();
  const [k, v] = Object.entries(flat.fieldErrors)[0] ?? [];
  return k && v?.[0] ? `${k}: ${v[0]}` : (flat.formErrors[0] ?? "Invalid input");
}

/** Only rows that are real strings become column values; blanks -> null. */
function nullable(v: string | undefined): string | null {
  return v && v.length > 0 ? v : null;
}

// ─── Create ─────────────────────────────────────────────────────────

/**
 * Create a school with everything it needs to be usable: the School row,
 * its SUPER_ADMIN account, a Main branch, an empty brand row and the
 * default chatbot knowledge sections. Everything after the School row is
 * created inside that school's tenant context so it is stamped correctly.
 */
export async function createSchool(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");

  const parsed = CreateSchema.safeParse({
    ...identityFrom(formData),
    slug: field(formData, "slug"),
    code: field(formData, "code"),
    adminName: field(formData, "adminName"),
    adminEmail: field(formData, "adminEmail"),
    adminPassword: String(formData.get("adminPassword") ?? ""),
  });
  if (!parsed.success) {
    redirect(`/portal/platform/schools?error=${encodeURIComponent(firstError(parsed.error))}`);
  }
  const d = parsed.data;

  const clash = await prismaBase.school.findFirst({
    where: { OR: [{ slug: d.slug }, { code: d.code }, ...(d.customDomain ? [{ customDomain: d.customDomain }] : [])] },
    select: { slug: true, code: true, customDomain: true },
  });
  if (clash) {
    const what = clash.slug === d.slug ? "slug" : clash.code === d.code ? "code" : "custom domain";
    redirect(`/portal/platform/schools?error=${encodeURIComponent(`That ${what} is already taken.`)}`);
  }
  const emailTaken = await prismaBase.user.findUnique({ where: { email: d.adminEmail }, select: { id: true } });
  if (emailTaken) {
    redirect(`/portal/platform/schools?error=${encodeURIComponent("An account with that admin email already exists.")}`);
  }

  const school = await prismaBase.school.create({
    data: {
      slug: d.slug,
      code: d.code,
      name: d.name,
      shortName: d.shortName,
      tagline: nullable(d.tagline),
      address: nullable(d.address),
      addressShort: nullable(d.addressShort),
      phone: nullable(d.phone),
      phoneIntl: nullable(d.phoneIntl),
      email: nullable(d.email),
      admissionsEmail: nullable(d.admissionsEmail),
      whatsapp: nullable(d.whatsapp),
      hours: nullable(d.hours),
      website: nullable(d.website),
      customDomain: nullable(d.customDomain),
      publicSiteEnabled: d.publicSiteEnabled,
      status: "TRIAL",
      socials: {},
      stats: {},
    },
  });

  await runAsSchool(school, async () => {
    await prisma.user.create({
      data: {
        name: d.adminName,
        email: d.adminEmail,
        passwordHash: await bcrypt.hash(d.adminPassword, 10),
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    await prisma.branch.create({
      data: {
        code: "MAIN",
        name: `${school.shortName} — Main`,
        address: school.addressShort,
        phone: school.phone,
        email: school.email,
        isMain: true,
        isActive: true,
      },
    });
    await prisma.schoolBrand.create({ data: {} });
    await prisma.knowledgeSection.createMany({
      data: defaultKnowledgeSections(toPublicSchool(school)).map(s => ({ ...s, isActive: true })),
    });
  });

  invalidateHostCache();
  auditLog({ action: "platform.school.create", targetType: "School", targetId: school.id, metadata: { slug: school.slug } });
  revalidatePath("/portal/platform/schools");
  redirect(`/portal/platform/schools/${school.id}?created=1`);
}

// ─── Update identity ────────────────────────────────────────────────

const UpdateSchema = IdentitySchema.extend({
  id: z.string().min(1),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED"]),
});

export async function updateSchool(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const parsed = UpdateSchema.safeParse({
    ...identityFrom(formData),
    id: field(formData, "id"),
    status: field(formData, "status"),
  });
  if (!parsed.success) {
    redirect(`/portal/platform/schools/${field(formData, "id")}?error=${encodeURIComponent(firstError(parsed.error))}`);
  }
  const d = parsed.data;

  if (d.customDomain) {
    const clash = await prismaBase.school.findFirst({ where: { customDomain: d.customDomain, NOT: { id: d.id } }, select: { id: true } });
    if (clash) redirect(`/portal/platform/schools/${d.id}?error=${encodeURIComponent("That custom domain belongs to another school.")}`);
  }

  await prismaBase.school.update({
    where: { id: d.id },
    data: {
      name: d.name,
      shortName: d.shortName,
      tagline: nullable(d.tagline),
      address: nullable(d.address),
      addressShort: nullable(d.addressShort),
      phone: nullable(d.phone),
      phoneIntl: nullable(d.phoneIntl),
      email: nullable(d.email),
      admissionsEmail: nullable(d.admissionsEmail),
      whatsapp: nullable(d.whatsapp),
      hours: nullable(d.hours),
      website: nullable(d.website),
      customDomain: nullable(d.customDomain),
      publicSiteEnabled: d.publicSiteEnabled,
      status: d.status,
    },
  });

  invalidateHostCache();
  auditLog({ action: "platform.school.update", targetType: "School", targetId: d.id });
  revalidatePath("/portal/platform/schools");
  redirect(`/portal/platform/schools/${d.id}?saved=1`);
}

// ─── Integrations (secrets are encrypted at rest, never echoed) ─────

const IntegrationsSchema = z.object({
  id: z.string().min(1),
  whatsappPhoneNumberId: z.string().trim().max(40).regex(/^\d*$/, "Digits only").optional().or(blank),
  whatsappAccessToken: z.string().trim().max(1000).optional().or(blank),
  clearWhatsappToken: z.boolean(),
  paystackSubaccountCode: opt(60),
  paystackPublicKey: opt(120),
  paystackSecretKey: z.string().trim().max(200).optional().or(blank),
  clearPaystackSecret: z.boolean(),
});

export async function updateIntegrations(formData: FormData) {
  await requireRole("PLATFORM_ADMIN");
  const parsed = IntegrationsSchema.safeParse({
    id: field(formData, "id"),
    whatsappPhoneNumberId: field(formData, "whatsappPhoneNumberId"),
    whatsappAccessToken: field(formData, "whatsappAccessToken"),
    clearWhatsappToken: formData.get("clearWhatsappToken") === "on",
    paystackSubaccountCode: field(formData, "paystackSubaccountCode"),
    paystackPublicKey: field(formData, "paystackPublicKey"),
    paystackSecretKey: field(formData, "paystackSecretKey"),
    clearPaystackSecret: formData.get("clearPaystackSecret") === "on",
  });
  if (!parsed.success) {
    redirect(`/portal/platform/schools/${field(formData, "id")}?error=${encodeURIComponent(firstError(parsed.error))}`);
  }
  const d = parsed.data;

  const wantsSecret = Boolean(d.whatsappAccessToken || d.paystackSecretKey);
  if (wantsSecret && !isEncryptionConfigured()) {
    redirect(`/portal/platform/schools/${d.id}?error=${encodeURIComponent("APP_ENCRYPTION_KEY is not set on the server, so secrets cannot be stored yet.")}`);
  }

  if (d.whatsappPhoneNumberId) {
    const clash = await prismaBase.school.findFirst({
      where: { whatsappPhoneNumberId: d.whatsappPhoneNumberId, NOT: { id: d.id } },
      select: { id: true },
    });
    if (clash) redirect(`/portal/platform/schools/${d.id}?error=${encodeURIComponent("That WhatsApp phone number id belongs to another school.")}`);
  }

  const data: Partial<Pick<School, "whatsappPhoneNumberId" | "whatsappAccessTokenEnc" | "paystackSubaccountCode" | "paystackPublicKey" | "paystackSecretKeyEnc">> = {
    whatsappPhoneNumberId: nullable(d.whatsappPhoneNumberId),
    paystackSubaccountCode: nullable(d.paystackSubaccountCode),
    paystackPublicKey: nullable(d.paystackPublicKey),
  };
  if (d.clearWhatsappToken) data.whatsappAccessTokenEnc = null;
  else if (d.whatsappAccessToken) data.whatsappAccessTokenEnc = encrypt(d.whatsappAccessToken);
  if (d.clearPaystackSecret) data.paystackSecretKeyEnc = null;
  else if (d.paystackSecretKey) data.paystackSecretKeyEnc = encrypt(d.paystackSecretKey);

  await prismaBase.school.update({ where: { id: d.id }, data });

  invalidateHostCache();
  auditLog({
    action: "platform.school.integrations",
    targetType: "School",
    targetId: d.id,
    metadata: {
      whatsappPhoneNumberId: data.whatsappPhoneNumberId ?? null,
      tokenChanged: d.clearWhatsappToken || Boolean(d.whatsappAccessToken),
      paystackSecretChanged: d.clearPaystackSecret || Boolean(d.paystackSecretKey),
    },
  });
  revalidatePath(`/portal/platform/schools/${d.id}`);
  redirect(`/portal/platform/schools/${d.id}?saved=1`);
}

// ─── Delete (test / abandoned schools only) ─────────────────────────

/**
 * Tenant tables reference School by a plain scalar, so there is no
 * cascade: remove the school's rows explicitly, most-dependent first,
 * then the School itself. Each model is retried across passes so a
 * foreign-key ordering mistake cannot leave rows behind.
 */
async function purgeSchoolData(schoolId: string) {
  const preferredOrder = [
    "WhatsAppMessage", "WhatsAppSession", "Message", "MessageThread", "Payment", "Fee",
    "Result", "StudentTermReport", "Attendance", "Award", "StudentNote", "HealthRecord",
    "DisciplinaryCase", "BookRequest", "Book", "TimetableEntry", "ClassSubject",
    "SubjectTeacher", "ClassTeacher", "ParentStudent", "Student", "Parent", "Teacher",
    "Class", "Subject", "Term", "AcademicSession", "FeeStructure", "Announcement",
    "Admission", "ContactMessage", "GalleryImage", "BlogPost", "Complaint",
    "KnowledgeSection", "SchoolBrand", "Branch", "Notification", "NotificationPrefs",
    "AdminPermissions", "AuditLog", "User",
  ];
  const models = preferredOrder.concat(Array.from(TENANT_MODELS).filter(m => !preferredOrder.includes(m)));
  const client = prismaBase as unknown as Record<string, { deleteMany: (args: unknown) => Promise<{ count: number }> }>;

  for (let pass = 0; pass < 4; pass++) {
    let failed = 0;
    for (const model of models) {
      const delegate = client[model[0].toLowerCase() + model.slice(1)];
      if (!delegate) continue;
      try {
        await delegate.deleteMany({ where: { schoolId } });
      } catch {
        failed++;
      }
    }
    if (failed === 0) return;
  }
  throw new Error("Could not remove every row for the school; some tables still reference others");
}

export async function deleteSchool(formData: FormData) {
  const me = await requireRole("PLATFORM_ADMIN");
  const id = field(formData, "id");
  const confirmSlug = field(formData, "confirmSlug").toLowerCase();

  const school = await prismaBase.school.findUnique({ where: { id } });
  if (!school) redirect("/portal/platform/schools?error=" + encodeURIComponent("School not found"));
  if (school!.slug !== confirmSlug) {
    redirect(`/portal/platform/schools/${id}?error=${encodeURIComponent("Type the school's slug exactly to confirm deletion.")}`);
  }
  if (school!.status !== "SUSPENDED") {
    redirect(`/portal/platform/schools/${id}?error=${encodeURIComponent("Suspend the school first, then delete it.")}`);
  }

  await purgeSchoolData(school!.id);
  await prismaBase.school.delete({ where: { id: school!.id } });

  invalidateHostCache();
  auditLog({ action: "platform.school.delete", targetType: "School", targetId: id, metadata: { slug: school!.slug, by: me.email } });
  revalidatePath("/portal/platform/schools");
  redirect(`/portal/platform/schools?deleted=${encodeURIComponent(school!.slug)}`);
}
