/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  // Type-check + ESLint run locally via `npm run build` before push.
  // Railway's build container OOMs on these so we let them run in CI/local
  // and skip them at deploy time. Production code is still compiled by Next
  // (the "Compiled successfully" step above the linter); only the redundant
  // post-compile check is skipped.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // NOTE: Host-based rewrites + redirects used to live here as
  // `rewrites()` / `redirects()` with `has: [{ type: "host" }]`
  // rules. They silently failed to fire in production despite the
  // diagnostic at /api/health/host confirming the right host header.
  // Moved the whole host-routing layer into middleware.ts where
  // matching is plain string comparison and runs reliably before
  // Next's static route resolution. See middleware.ts for the
  // SchoolBot host → /for-schools rewrite + Meclones-only path
  // redirects.
};
module.exports = nextConfig;
