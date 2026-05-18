import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatAnnouncements } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

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

  return NextResponse.json({
    ok: true,
    count: items.length,
    items,
    message: formatAnnouncements(items),
  });
}
