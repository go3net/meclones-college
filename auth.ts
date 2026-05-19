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

const Credentials_Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = Credentials_Schema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true, image: true },
        });
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
