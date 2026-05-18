import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge-runtime safe — uses only the JWT-strategy session check, no Prisma.
// `authorized()` in auth.config.ts decides allow/redirect.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on every portal path; skip static files and the auth API itself.
  matcher: ["/portal/:path*"],
};
