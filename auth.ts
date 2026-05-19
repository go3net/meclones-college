import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "./lib/prisma";

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
      },
      async authorize(credentials) {
        const raw = String(credentials?.identifier ?? credentials?.email ?? "").trim();
        const password = String(credentials?.password ?? "");
        const parsed = Credentials_Schema.safeParse({ identifier: raw, password });
        if (!parsed.success) return null;

        let user: { id: string; name: string; email: string; passwordHash: string; role: string; isActive: boolean; image: string | null } | null = null;

        if (looksLikeEmail(raw)) {
          user = await prisma.user.findUnique({
            where: { email: raw.toLowerCase() },
            select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true, image: true },
          });
        } else {
          // Treat as admission number — find the linked User via Student.
          const student = await prisma.student.findUnique({
            where: { admissionNumber: raw },
            include: {
              user: { select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true, image: true } },
            },
          });
          user = student?.user ?? null;
        }

        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
