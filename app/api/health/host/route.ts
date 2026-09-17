// app/api/health/host/route.ts
//
// Diagnostic endpoint: which host the request arrived on, which school
// (tenant) that host resolves to, and how the tenancy backfill went.
// Lets us verify DNS, custom domains and the multi-tenant plumbing from
// a browser without shell access to Railway:
//
//   curl https://schoolbot.com.ng/api/health/host
//   → { host: "schoolbot.com.ng", brand: "SCHOOLBOT", school: null, ... }
//
//   curl https://meclonescollege.com/api/health/host
//   → { host: "meclonescollege.com", brand: "MECLONES", school: { slug: "meclones", ... } }
//
//   curl "https://.../api/health/host?orphans=1"
//   → adds per-model counts of rows whose schoolId is still NULL (should
//     all be zero once the boot backfill has run).
//
// Reads through prismaBase on purpose: this is a platform-level view.

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prismaBase } from "@/lib/prisma";
import { missingContextStats } from "@/lib/prisma-tenant-extension";
import { isEncryptionConfigured } from "@/lib/crypto";
import { resolveSchoolByHost, isPlatformHost, slugFromHost, PLATFORM_ROOT_DOMAIN, DEFAULT_SCHOOL_SLUG } from "@/lib/host";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_MODELS = Prisma.dmmf.datamodel.models
  .filter(m => m.fields.some(f => f.name === "schoolId"))
  .map(m => m.name);

async function orphanCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const model of TENANT_MODELS) {
    const delegate = (prismaBase as unknown as Record<string, { count: (args: unknown) => Promise<number> }>)[
      model[0].toLowerCase() + model.slice(1)
    ];
    const n = await delegate.count({ where: { schoolId: null } });
    if (n > 0) out[model] = n;
  }
  return out;
}

export async function GET(req: NextRequest) {
  const h = headers();
  // This route is excluded from the middleware, so no x-tenant-host here;
  // the raw host is authoritative.
  const host = (h.get("host") ?? h.get("x-forwarded-host") ?? "").toLowerCase();
  const platform = isPlatformHost(host);

  let school: { id: string; slug: string; name: string; customDomain: string | null; status: string } | null = null;
  let schoolCount: number | null = null;
  let platformAdmins: number | null = null;
  let platformAdminSetup: { emailSet: boolean; passwordSet: boolean; existingUserRole: string | null; existingUserHasSchool: boolean | null } | null = null;
  let error: string | null = null;
  try {
    const s = await resolveSchoolByHost(host);
    if (s) school = { id: s.id, slug: s.slug, name: s.name, customDomain: s.customDomain, status: s.status };
    schoolCount = await prismaBase.school.count();
    platformAdmins = await prismaBase.user.count({ where: { role: "PLATFORM_ADMIN", isActive: true } });
    // Why the boot script may not have created the operator account:
    // env missing, or the email already belongs to a user with another role.
    const adminEmail = (process.env.PLATFORM_ADMIN_EMAIL ?? "").trim().toLowerCase();
    const existing = adminEmail
      ? await prismaBase.user.findUnique({ where: { email: adminEmail }, select: { role: true, schoolId: true } })
      : null;
    platformAdminSetup = {
      emailSet: Boolean(adminEmail),
      passwordSet: Boolean((process.env.PLATFORM_ADMIN_PASSWORD ?? "").trim()),
      existingUserRole: existing?.role ?? null,
      existingUserHasSchool: existing ? Boolean(existing.schoolId) : null,
    };
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const wantOrphans = req.nextUrl.searchParams.get("orphans") === "1";
  let orphans: Record<string, number> | null = null;
  if (wantOrphans && !error) {
    try {
      orphans = await orphanCounts();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    ok:               !error,
    host,
    forwardedHost:    h.get("x-forwarded-host") ?? null,
    forwardedProto:   h.get("x-forwarded-proto") ?? null,
    platformRoot:     PLATFORM_ROOT_DOMAIN,
    defaultSchoolSlug: DEFAULT_SCHOOL_SLUG,
    brand:            platform ? "SCHOOLBOT" : "SCHOOL",
    indexRoute:       platform ? "/for-schools" : "/",
    slugFromHost:     slugFromHost(host),
    school,
    schoolCount,
    // Platform setup checks: the operator account exists (created at boot
    // from PLATFORM_ADMIN_EMAIL/PASSWORD) and secrets can be encrypted.
    platformAdmins,
    platformAdminSetup,
    encryptionConfigured: isEncryptionConfigured(),
    tenantModels:     TENANT_MODELS.length,
    orphans,          // null unless ?orphans=1; {} means fully backfilled
    // Tenant-model queries this process ran with no school context
    // (model.operation -> count). Empty is the goal before flipping
    // TENANT_ENFORCEMENT to strict. Process-local, resets on restart.
    enforcement:      (process.env.TENANT_ENFORCEMENT ?? "warn").trim().toLowerCase(),
    unscopedQueries:  missingContextStats(),
    error,
    // Bump whenever host routing / tenancy plumbing changes so the next
    // deploy is easy to verify with one curl.
    buildFingerprint: "tenancy-injector-2026-09-17",
    timestamp:        new Date().toISOString(),
  });
}
