/**
 * Public brand directory. Returns the school's current logo URLs +
 * brand hex colours so the Logo component can render the right thing
 * across the public site + portal. Cached for 60s at the edge.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const brand = await prisma.schoolBrand.findUnique({ where: { id: "default" } });
  return NextResponse.json(
    {
      logoUrl: brand?.logoUrl ?? null,
      logoSquareUrl: brand?.logoSquareUrl ?? null,
      primaryHex: brand?.primaryHex ?? null,
      accentHex: brand?.accentHex ?? null,
    },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
