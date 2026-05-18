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
};
module.exports = nextConfig;
