/**
 * Public brand directory. Returns the school's current logo URLs +
 * brand hex colours so the Logo component can render the right thing
 * across the public site + portal. Cached for 60s at the edge.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSchool } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // One row per school; scoped by the tenant extension. With no school
  // (the platform host) there is no brand row to read: answer with nulls
  // rather than let an unscoped query return some other school's logo.
  const school = await getCurrentSchool();
  const brand = school ? await prisma.schoolBrand.findFirst() : null;
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
