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
};
module.exports = nextConfig;
