/**
 * Scheduled DB backup. Same JSON payload as /api/admin/export/backup,
 * but uploaded to Cloudinary as a raw file rather than streamed to a
 * browser. Run this from Railway's cron-job service (or any cron-like)
 * once a day:
 *
 *   POST https://meclones-college-production.up.railway.app/api/cron/backup
 *   Authorization: Bearer $CRON_SECRET
 *
 * The endpoint also accepts the secret via `x-cron-secret:` header for
 * platforms that don't let you set Authorization easily.
 *
 * Why a separate cron upload instead of relying on Railway's automatic
 * Postgres backup? Because the Cloudinary copy lives off-platform — if
 * the whole Railway project is deleted by accident, the school's data
 * survives. Cheap insurance.
 *
 * Required env:
 *   CRON_SECRET                — bearer token for this endpoint
 *   CLOUDINARY_CLOUD_NAME      — already set for photo uploads
 *   CLOUDINARY_API_KEY         — already set
 *   CLOUDINARY_API_SECRET      — already set
 */

import { NextRequest, NextResponse } from "next/server";
import type { School } from "@prisma/client";
import { buildBackupPayload } from "@/lib/backup";
import { uploadRawBuffer } from "@/lib/cloudinary";
import { auditLog } from "@/lib/audit";
import { prismaBase } from "@/lib/prisma";
import { runAsSchool } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[cron/backup] CRON_SECRET not set — bypassing auth (dev only)");
    return true;
  }
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const direct = req.headers.get("x-cron-secret");
  const provided = bearer ?? direct;
  return provided === expected;
}

type SchoolBackupResult =
  | { slug: string; ok: true; bytes: number; url: string; publicId: string; elapsedMs: number; counts: Record<string, number> }
  | { slug: string; ok: false; error: string };

/** Snapshot one school. Runs inside that school's tenant context. */
async function backupSchool(school: School, exportedAt: string): Promise<SchoolBackupResult> {
  const startedAt = Date.now();

  let payload: Awaited<ReturnType<typeof buildBackupPayload>>;
  try {
    payload = await buildBackupPayload({ exportedAt, exportedBy: null, source: "cron" });
  } catch (err) {
    console.error(`[cron/backup] ${school.slug}: build failed`, err);
    return { slug: school.slug, ok: false, error: "build_failed" };
  }

  const buffer = Buffer.from(JSON.stringify(payload), "utf-8");
  const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${school.slug}_backup_${stamp}.json`;

  let upload: Awaited<ReturnType<typeof uploadRawBuffer>>;
  try {
    upload = await uploadRawBuffer(buffer, filename, { folder: `${school.slug}/backups` });
  } catch (err) {
    console.error(`[cron/backup] ${school.slug}: cloudinary upload failed`, err);
    auditLog({
      action: "backup.cron_failed",
      metadata: { error: err instanceof Error ? err.message : String(err), bytes: buffer.length, ...payload.counts },
    });
    return { slug: school.slug, ok: false, error: "upload_failed" };
  }

  const elapsedMs = Date.now() - startedAt;
  await auditLog({
    action: "backup.cron_success",
    metadata: { url: upload.secure_url, publicId: upload.public_id, bytes: upload.bytes, elapsedMs, ...payload.counts },
  });

  return {
    slug: school.slug,
    ok: true,
    bytes: upload.bytes,
    url: upload.secure_url,
    publicId: upload.public_id,
    elapsedMs,
    counts: payload.counts,
  };
}

async function run(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const exportedAt = new Date().toISOString();

  // One snapshot per school, each built inside that school's context so
  // the scoped client only ever sees that school's rows.
  const schools = await prismaBase.school.findMany({ orderBy: { createdAt: "asc" } });
  const results: SchoolBackupResult[] = [];
  for (const school of schools) {
    results.push(await runAsSchool(school, () => backupSchool(school, exportedAt)));
  }

  const failed = results.filter(r => !r.ok);
  return NextResponse.json(
    { ok: failed.length === 0, exportedAt, schools: results },
    { status: failed.length === 0 ? 200 : failed.length === results.length ? 502 : 207 },
  );
}

// Accept GET for cron platforms that only do GET, AND POST for ones that
// want a side-effect verb. Both behave identically.
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
