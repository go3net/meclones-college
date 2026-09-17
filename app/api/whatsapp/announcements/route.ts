import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatAnnouncements } from "@/lib/whatsapp";
import { withRelaySchool } from "@/lib/relay-tenant";
import { getSchoolPublic } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;
  // Bind the tenant (x-school-slug header, else the request host).
  return withRelaySchool(req, () => handle(req));
}

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 3) || 3, 10);

  const items = await prisma.announcement.findMany({
    where: {
      OR: [{ audience: "ALL" }, { audience: "PARENTS" }],
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { id: true, title: true, body: true, publishedAt: true },
  });

  const school = await getSchoolPublic();
  return NextResponse.json({
    ok: true,
    count: items.length,
    items,
    message: formatAnnouncements(items, school),
  });
}
