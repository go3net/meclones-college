/**
 * Full-database JSON backup, downloaded on demand. The actual building
 * lives in lib/backup.ts so the scheduled cron endpoint at
 * /api/cron/backup produces an identical file.
 *
 * Auth: DIRECTOR / SUPER_ADMIN. Passwords + TOTP secrets are excluded.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/audit";
import { buildBackupPayload } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const payload = await buildBackupPayload({
    exportedAt: new Date().toISOString(),
    exportedBy: { id: user.id, name: user.name, email: user.email, role: user.role },
    source: "manual",
  });

  auditLog({
    action: "export.full_backup",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: payload.counts,
  });

  const filename = `meclones_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
