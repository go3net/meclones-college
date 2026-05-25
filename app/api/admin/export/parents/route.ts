/**
 * CSV export of every parent with their children + contact info.
 * Admin / Director / Super-admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { buildCsv, csvResponse, todayStamp } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const parents = await prisma.parent.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true, isActive: true } },
      children: {
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              classRef: { select: { name: true, arm: true } },
            },
          },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const headers = [
    "Parent Name", "Email", "Phone", "Active", "WhatsApp opt-in",
    "Children", "Children Count",
    "Joined",
  ];

  const rows = parents.map(p => [
    p.user.name,
    p.user.email,
    p.user.phone ?? "",
    p.user.isActive ? "Yes" : "No",
    p.whatsappOptIn ? "Yes" : "No",
    p.children.map(c => {
      const cls = c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "—";
      return `${c.student.user.name} (${c.student.admissionNumber} · ${cls})`;
    }).join("; "),
    p.children.length,
    p.createdAt.toISOString().slice(0, 10),
  ]);

  const csv = buildCsv(headers, rows);

  auditLog({
    action: "export.parents",
    actor: { id: user.id, name: user.name, email: user.email, role: user.role },
    metadata: { count: parents.length },
  });

  return csvResponse(`meclones_parents_${todayStamp()}.csv`, csv);
}
