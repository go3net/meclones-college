/**
 * Lightweight branch directory for the BranchSwitcher in the portal
 * header. Returns every active branch + the currently-selected branch
 * id (from cookie). Auth-gated — only staff sees branches.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { getActiveBranchIdFromCookie } from "@/lib/branch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(user.role)) {
    return NextResponse.json({ branches: [], activeId: null });
  }

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
    select: { id: true, code: true, name: true, isMain: true },
  });

  return NextResponse.json({
    branches,
    activeId: getActiveBranchIdFromCookie(),
  });
}
