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
import { buildBackupPayload } from "@/lib/backup";
import { uploadRawBuffer } from "@/lib/cloudinary";
import { auditLog } from "@/lib/audit";

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

async function run(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const exportedAt = new Date().toISOString();

  let payload: Awaited<ReturnType<typeof buildBackupPayload>>;
  try {
    payload = await buildBackupPayload({
      exportedAt,
      exportedBy: null,
      source: "cron",
    });
  } catch (err) {
    console.error("[cron/backup] build failed", err);
    return NextResponse.json({ ok: false, error: "build_failed" }, { status: 500 });
  }

  const json = JSON.stringify(payload);
  const buffer = Buffer.from(json, "utf-8");
  const stamp = exportedAt.slice(0, 19).replace(/[:T]/g, "-");
  const filename = `meclones_backup_${stamp}.json`;

  let upload: Awaited<ReturnType<typeof uploadRawBuffer>> | null = null;
  try {
    upload = await uploadRawBuffer(buffer, filename, { folder: "meclones/backups" });
  } catch (err) {
    console.error("[cron/backup] cloudinary upload failed", err);
    auditLog({
      action: "backup.cron_failed",
      metadata: { error: err instanceof Error ? err.message : String(err), bytes: buffer.length, ...payload.counts },
    });
    return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 502 });
  }

  const elapsedMs = Date.now() - startedAt;

  await auditLog({
    action: "backup.cron_success",
    metadata: {
      url: upload.secure_url,
      publicId: upload.public_id,
      bytes: upload.bytes,
      elapsedMs,
      ...payload.counts,
    },
  });

  return NextResponse.json({
    ok: true,
    exportedAt,
    bytes: upload.bytes,
    url: upload.secure_url,
    publicId: upload.public_id,
    elapsedMs,
    counts: payload.counts,
  });
}

// Accept GET for cron platforms that only do GET, AND POST for ones that
// want a side-effect verb. Both behave identically.
export async function GET(req: NextRequest) { return run(req); }
export async function POST(req: NextRequest) { return run(req); }
