/**
 * GET /api/embed/config?key=sb_…
 *
 * Public, CORS-enabled. Returns what the embeddable widget needs to draw
 * itself for one school: identity, contact, brand colours, greeting.
 * Never returns anything secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAsSchool } from "@/lib/tenant-context";
import { toPublicSchool } from "@/lib/school-public";
import { corsHeaders, loadSchoolByEmbedKey, originAllowed } from "@/lib/embed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const school = await loadSchoolByEmbedKey(req.nextUrl.searchParams.get("key"));
  if (!school || !school.embedEnabled || school.status === "SUSPENDED") {
    return NextResponse.json({ error: "unknown_key" }, { status: 404, headers: corsHeaders(origin) });
  }
  if (!originAllowed(school, origin)) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers: corsHeaders(origin) });
  }

  const pub = toPublicSchool(school);
  const brand = await runAsSchool(school, () =>
    prisma.schoolBrand.findFirst({ select: { logoUrl: true, logoSquareUrl: true, primaryHex: true, accentHex: true } }),
  );

  return NextResponse.json(
    {
      school: {
        name: pub.name,
        shortName: pub.shortName,
        tagline: pub.tagline,
        phone: pub.phone,
        phoneIntl: pub.phoneIntl,
        email: pub.email,
        whatsapp: pub.whatsapp,
        website: pub.website,
        portalUrl: `${pub.website}/portal/login`,
      },
      brand: {
        primaryHex: brand?.primaryHex ?? "#0B1F4B",
        accentHex: brand?.accentHex ?? "#D4A017",
        logoUrl: brand?.logoSquareUrl ?? brand?.logoUrl ?? null,
      },
      chat: {
        enabled: true,
        greeting: `Hi! I'm the ${pub.shortName} virtual assistant. Ask me anything about our school — admissions, programs, fees, visits, contact, the portal. How can I help?`,
        quickPrompts: [
          "How do I apply for admission?",
          "How much are the fees?",
          "Can I book a tour?",
          "What programs do you offer?",
        ],
        whatsappText: `Hello ${pub.shortName}, I'd like to speak to someone.`,
      },
    },
    { headers: { ...corsHeaders(origin), "Cache-Control": "public, max-age=60" } },
  );
}
