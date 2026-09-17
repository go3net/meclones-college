import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers } from "next/headers";
import { authConfig } from "./auth.config";
import { prismaBase } from "./lib/prisma";
import { verifyTotpCode, consumeRecoveryCode } from "./lib/totp";
import { resolveSchoolByHost } from "./lib/host";

// NOTE: We use JWT session strategy (set in auth.config.ts) — the Prisma
// adapter is intentionally NOT attached. The adapter exists to persist
// Account/Session rows for database sessions; with JWT sessions, each
// adapter lookup just adds latency to every request and login round-trip
// without giving us anything. Skipping it materially speeds up sign-in.

// Login accepts either an email OR a student admission number — useful for
// younger students who don't yet have a personal email address.
const Credentials_Schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

function looksLikeEmail(s: string): boolean {
  return s.includes("@");
}

/**
 * School the login request arrived at, by host. Null on the bare
 * platform host or when no request context is available.
 */
async function hostSchoolId(): Promise<string | null> {
  try {
    const h = headers();
    const school = await resolveSchoolByHost(h.get("host") ?? h.get("x-forwarded-host") ?? "");
    return school?.id ?? null;
  } catch {
    return null;
  }
}

// Login is deliberately unscoped: it runs before any tenant is known, so it
// reads through prismaBase and enforces the school match itself below.
const USER_SELECT = {
  id: true, name: true, email: true, passwordHash: true, role: true, isActive: true,
  image: true, totpSecret: true, totpEnabledAt: true, schoolId: true,
} as const;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        // The form posts `email` for backwards compat; `identifier` works too.
        email: { label: "Email or Admission Number", type: "text" },
        identifier: { label: "Identifier", type: "text" },
        password: { label: "Password", type: "password" },
        // Optional 6-digit TOTP code. Required for users with 2FA enabled.
        totpCode: { label: "Two-factor code", type: "text" },
      },
      async authorize(credentials) {
        const raw = String(credentials?.identifier ?? credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        const totpCode = String(credentials?.totpCode ?? "").trim();
        const parsed = Credentials_Schema.safeParse({ identifier: raw, password });
        if (!parsed.success) return null;

        let user: { id: string; name: string; email: string; passwordHash: string; role: string; isActive: boolean; image: string | null; totpSecret: string | null; totpEnabledAt: Date | null; schoolId: string | null } | null = null;

        if (looksLikeEmail(raw)) {
          user = await prismaBase.user.findUnique({
            where: { email: raw.toLowerCase() },
            select: USER_SELECT,
          });
        } else {
          // Treat as admission number — find the linked User via Student.
          const student = await prismaBase.student.findUnique({
            where: { admissionNumber: raw },
            include: { user: { select: USER_SELECT } },
          });
          user = student?.user ?? null;
        }

        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Tenant check: a school's users may only sign in on that school's
        // host (its subdomain or custom domain). The bare platform host
        // resolves to no school and accepts anyone; platform admins belong
        // to no school and may sign in anywhere. A user still lacking a
        // schoolId (row not yet backfilled) is let through rather than
        // locked out.
        if (user.role !== "PLATFORM_ADMIN" && user.schoolId) {
          const hostSchool = await hostSchoolId();
          if (hostSchool && hostSchool !== user.schoolId) return null;
        }

        // 2FA: enforced when the user has enrolled. Accept either a 6-digit
        // TOTP code OR a 10-char recovery code (xxxxx-xxxxx). Recovery
        // codes are consumed on use.
        if (user.totpEnabledAt && user.totpSecret) {
          if (!totpCode) return null;
          const looksLikeRecovery = /[a-z]/i.test(totpCode); // TOTP is all digits
          if (looksLikeRecovery) {
            const ok = await consumeRecoveryCode(user.id, totpCode);
            if (!ok) return null;
          } else if (!verifyTotpCode(user.totpSecret, totpCode)) {
            return null;
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          role: user.role,
          schoolId: user.schoolId,
        };
      },
    }),
  ],
});
