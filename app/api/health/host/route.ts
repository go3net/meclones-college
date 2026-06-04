// app/api/health/host/route.ts
//
// Tiny diagnostic endpoint: returns the host the request arrived on
// + which brand the rewrite layer would render. Used to verify the
// schoolbot.com.ng custom domain + DNS setup without leaving the
// browser:
//
//   curl https://schoolbot.com.ng/api/health/host
//   → { host: "schoolbot.com.ng", brand: "SCHOOLBOT", indexRoute: "/for-schools" }
//
//   curl https://meclonescollege.com/api/health/host
//   → { host: "meclonescollege.com", brand: "MECLONES", indexRoute: "/" }
//
// If either domain returns the wrong brand, the next.config rewrite
// isn't matching — usually means Railway's Cloudflare proxy is
// stripping the Host header. The endpoint surfaces the actual host
// it received so we can pinpoint the layer that's wrong.

import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const SCHOOLBOT_HOSTS = new Set([
  "schoolbot.com.ng",
  "www.schoolbot.com.ng",
]);

export async function GET() {
  // Read the host the way Next.js's rewrite engine reads it — same
  // header it matches against in the `has: [{ type: "host" }]` rule.
  // Falling back to x-forwarded-host because Railway's proxy
  // sometimes rewrites Host but leaves x-forwarded-host intact.
  const h    = headers();
  const host = (h.get("host") ?? h.get("x-forwarded-host") ?? "").toLowerCase();

  const isSchoolbot = SCHOOLBOT_HOSTS.has(host);

  return NextResponse.json({
    ok:               true,
    host,
    forwardedHost:    h.get("x-forwarded-host") ?? null,
    forwardedProto:   h.get("x-forwarded-proto") ?? null,
    brand:            isSchoolbot ? "SCHOOLBOT" : "MECLONES",
    // What the user sees when they hit "/" on this host. If a
    // visitor reports "schoolbot.com.ng shows the school home",
    // this field is what tells us the rewrite isn't matching.
    indexRoute:       isSchoolbot ? "/for-schools" : "/",
    timestamp:        new Date().toISOString(),
  });
}
