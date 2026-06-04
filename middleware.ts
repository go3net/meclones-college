import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

// Edge-runtime safe — uses only the JWT-strategy session check, no Prisma.
// `authorized()` in auth.config.ts decides allow/redirect for /portal/*
// paths; everything else passes through.
const { auth } = NextAuth(authConfig);

// Hosts that should serve the SchoolBot SaaS landing instead of the
// Meclones school site. The host header check is split out so both
// the rewrite and the meclones-only redirect agree on the same set.
const SCHOOLBOT_HOSTS = new Set(["schoolbot.com.ng", "www.schoolbot.com.ng"]);

// Public school pages that ONLY make sense on meclonescollege.com.
// On schoolbot.com.ng these would leak Meclones-specific copy (about,
// admissions team, etc.) — redirect to the SaaS landing instead.
const MECLONES_ONLY_RE = /^\/(about|academics|admission|apply|book-visit|contact|gallery|news|parents)(\/|$)/i;

/**
 * Middleware composes two responsibilities:
 *
 *   1. HOST-BASED ROUTING (for the SchoolBot domain)
 *      Previously lived in next.config.js `rewrites()` + `redirects()`
 *      with `has: [{ type: "host" }]` rules, but those were silently
 *      not firing in production despite the diagnostic confirming the
 *      host header was right. Doing it in middleware here is more
 *      reliable because (a) middleware runs before Next.js's static
 *      route resolution, (b) host matching is plain string comparison
 *      with no Next.js routing-table quirks.
 *
 *   2. PORTAL AUTH GATE (existing)
 *      NextAuth v5's `authorized()` callback (see auth.config.ts)
 *      decides who can see /portal/*. It already returns `true` for
 *      everything outside /portal so expanding the matcher below to
 *      include the public pages doesn't break anything.
 */
export default auth(req => {
  const rawHost = req.headers.get("host") ?? "";
  // Strip the optional :port suffix — Railway never serves on a
  // non-standard port externally but defensively normalising means
  // local dev (host:3000) also matches.
  const host = rawHost.toLowerCase().split(":")[0];
  const pathname = req.nextUrl.pathname;

  // ── SchoolBot host routing ──
  if (SCHOOLBOT_HOSTS.has(host)) {
    // Root → internal rewrite to the SaaS landing. URL bar stays
    // "/" because the rewrite is server-side; no 301, no SEO penalty.
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/for-schools";
      return NextResponse.rewrite(url);
    }
    // Meclones-only paths → 308 redirect to /. Permanent so search
    // engines learn never to index them under the SaaS domain.
    if (MECLONES_ONLY_RE.test(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url, 308);
    }
  }

  // Everything else falls through. /portal/* gets auth-gated by the
  // wrapping auth() — NextAuth handles that via the authorized()
  // callback before this function even runs.
  return NextResponse.next();
});

export const config = {
  // Match the paths we care about, exclude static assets so the
  // middleware doesn't run for every image / chunk. The negated
  // pattern (?!...) is the Next.js-recommended way to express "all
  // pages but not static". We also keep /api/health/host explicit so
  // the diagnostic endpoint never gets accidentally rewritten.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health|.*\\..*).*)",
  ],
};
