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

  // Host-based rewrites. The same Next.js app serves two brands from
  // one deployment:
  //   - meclonescollege.com         → the actual Meclones school site
  //                                    (home stays at /)
  //   - schoolbot.com.ng (+ www)    → the SchoolBot SaaS sales site,
  //                                    home is the /for-schools landing
  //
  // The rewrite is INTERNAL — schoolbot.com.ng/ in the URL bar but
  // the page rendered is the /for-schools route. No redirect, no
  // 301, no SEO penalty. Other paths fall through unchanged so the
  // for-schools page's links to /showcase, /whatsapp, etc. still
  // resolve normally.
  async rewrites() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "schoolbot.com.ng" }],
        destination: "/for-schools",
      },
      {
        source: "/",
        has: [{ type: "host", value: "www.schoolbot.com.ng" }],
        destination: "/for-schools",
      },
    ];
  },

  // Host-based redirects. Meclones-specific public pages (school
  // about / admission / academics / contact / etc.) get redirected
  // to the SchoolBot root when someone hits them via the SaaS
  // domain. Without this, schoolbot.com.ng/about would show "About
  // Meclones College" with the school's address + admin team —
  // wrong brand, wrong info. SchoolBot-only paths (/showcase,
  // /for-schools) and shared infrastructure (/api, /_next, portal
  // login) pass through unchanged.
  //
  // Use 308 (permanent) so search engines treat the school pages
  // on the SaaS domain as never indexable, but visitors get an
  // explicit redirect they can see in the URL bar.
  async redirects() {
    const SCHOOLBOT_HOSTS = [
      { type: "host", value: "schoolbot.com.ng" },
      { type: "host", value: "www.schoolbot.com.ng" },
    ];
    // Pages that exist on the Meclones school site but shouldn't
    // surface under the SchoolBot SaaS brand. Listed explicitly
    // rather than "everything except X" because new SchoolBot
    // pages should be allowed by default — a deny-list is safer
    // when we ship a new SchoolBot section to forget than an
    // allow-list to forget to update.
    const MECLONES_ONLY_PATHS = [
      "/about",
      "/about/:slug*",
      "/academics",
      "/academics/:slug*",
      "/admission",
      "/admission/:slug*",
      "/apply",
      "/apply/:slug*",
      "/book-visit",
      "/contact",
      "/gallery",
      "/gallery/:slug*",
      "/news",
      "/news/:slug*",
      "/parents",
      "/parents/:slug*",
    ];

    return [
      // For each Schoolbot host, redirect Meclones-only paths to /.
      ...SCHOOLBOT_HOSTS.flatMap(host =>
        MECLONES_ONLY_PATHS.map(source => ({
          source,
          has: [host],
          destination: "/",
          permanent: true,
        })),
      ),
    ];
  },
};
module.exports = nextConfig;
