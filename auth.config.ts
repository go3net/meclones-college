import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config. Imported by `middleware.ts` (Edge runtime) and
 * extended by `auth.ts` (Node runtime) which adds the Prisma adapter and the
 * credentials provider's `authorize()` callback (both need Node APIs).
 *
 * Keep this file free of Node-only imports (no Prisma, no bcrypt, no fs).
 */

export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/portal/director",
  DIRECTOR: "/portal/director",
  ADMIN: "/portal/admin",
  ACCOUNTANT: "/portal/accountant",
  TEACHER: "/portal/teacher",
  STUDENT: "/portal/student",
  PARENT: "/portal/parent",
};

// Which role(s) may access which path prefix in /portal/*
export const PORTAL_ACL: { prefix: string; roles: string[] }[] = [
  { prefix: "/portal/director", roles: ["SUPER_ADMIN", "DIRECTOR"] },
  { prefix: "/portal/admin", roles: ["SUPER_ADMIN", "DIRECTOR", "ADMIN"] },
  { prefix: "/portal/accountant", roles: ["SUPER_ADMIN", "DIRECTOR", "ACCOUNTANT"] },
  { prefix: "/portal/teacher", roles: ["SUPER_ADMIN", "TEACHER"] },
  { prefix: "/portal/student", roles: ["SUPER_ADMIN", "STUDENT"] },
  { prefix: "/portal/parent", roles: ["SUPER_ADMIN", "PARENT"] },
];

const PUBLIC_PORTAL_PATHS = ["/portal/login", "/portal/forgot"];

export const authConfig = {
  pages: {
    signIn: "/portal/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        (session.user as { role?: string }).role = token.role as string | undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      const url = request.nextUrl;
      const path = url.pathname;

      // Not a portal route — let it through.
      if (!path.startsWith("/portal")) return true;

      // Public portal routes (login, forgot) — always allow.
      if (PUBLIC_PORTAL_PATHS.some(p => path === p || path.startsWith(p + "/"))) {
        return true;
      }

      // Authenticated check.
      const role = (auth?.user as { role?: string } | undefined)?.role;
      if (!auth || !role) return false;

      // Role-based check: does this user's role have access to this path?
      const matchedAcl = PORTAL_ACL.find(r => path.startsWith(r.prefix));
      if (matchedAcl && !matchedAcl.roles.includes(role)) {
        // Wrong role — redirect to their own home
        const home = ROLE_HOME[role] ?? "/portal/login";
        return Response.redirect(new URL(home, url));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
