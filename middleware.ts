import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { isPlatformHost, TENANT_HOST_HEADER } from "./lib/host-utils";

// Edge-runtime safe — uses only the JWT-strategy session check, no Prisma.
// `authorized()` in auth.config.ts decides allow/redirect for /portal/*
// paths; everything else passes through.
const { auth } = NextAuth(authConfig);

// The bare platform host (PLATFORM_ROOT_DOMAIN, with or without www)
// serves the SchoolBot SaaS landing. Every other host — a school's
// {slug}.<root> subdomain, its custom domain, or the Railway URL — is
// resolved to a school in Node code (lib/host.ts); the middleware only
// needs the pure string check.

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
  const pathname = req.nextUrl.pathname;

  // Forward the real host to server code on EVERY request. A rewrite
  // below swaps the URL for the deployment's own hostname, which would
  // otherwise make the tenant resolver pick the default school on the
  // platform host. Always overwritten here so it cannot be spoofed.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TENANT_HOST_HEADER, rawHost);
  const init = { request: { headers: requestHeaders } };

  // ── SchoolBot host routing ──
  if (isPlatformHost(rawHost)) {
    // Root → internal rewrite to the SaaS landing. URL bar stays
    // "/" because the rewrite is server-side; no 301, no SEO penalty.
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/for-schools";
      return NextResponse.rewrite(url, init);
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
  return NextResponse.next(init);
});

export const config = {
  // Run for every request except Next's own static output and the
  // health endpoints, so the tenant-host header above is present (and
  // trustworthy) on every route that resolves a school, including
  // dotted paths like /manifest.webmanifest and /.../slip.pdf.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/health).*)",
  ],
};
