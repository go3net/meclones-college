/**
 * "Which school is this code running for?"
 *
 * Resolution order:
 *   1. An explicit AsyncLocalStorage context (`runAsSchool`) always wins.
 *      Webhooks, cron and scripts set it; it also lets platform admins
 *      act on any school.
 *   2. The request host (slug subdomain, custom domain, default slug).
 *   3. The signed-in user's `schoolId` from the JWT. Only reached on the
 *      bare platform host, where the host says nothing.
 *   4. null: no tenant (the SaaS landing, platform-admin screens).
 *
 * Per-request memoisation is keyed on the `headers()` object, which
 * Next.js keeps stable for the lifetime of one request.
 */

import { headers } from "next/headers";
import type { School } from "@prisma/client";
import { tenantStorage } from "./tenant-context";
import { loadSchoolById, resolveSchoolByHost } from "./host";

const memo = new WeakMap<object, Promise<School | null>>();

export async function getCurrentSchool(): Promise<School | null> {
  const store = tenantStorage.getStore();
  if (store) return store.school;

  let h: ReturnType<typeof headers>;
  try {
    h = headers();
  } catch {
    // Outside a request (build-time, scripts without runAsSchool).
    return null;
  }

  let pending = memo.get(h);
  if (!pending) {
    pending = resolveFromRequest(h);
    memo.set(h, pending);
  }
  return pending;
}

async function resolveFromRequest(h: ReturnType<typeof headers>): Promise<School | null> {
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? "";
  const byHost = await resolveSchoolByHost(host);
  if (byHost) return byHost;

  try {
    // Dynamic import: lib/prisma -> lib/tenant -> auth -> lib/prisma would
    // otherwise be a static cycle.
    const { auth } = await import("@/auth");
    const session = await auth();
    const schoolId = (session?.user as { schoolId?: string | null } | undefined)?.schoolId;
    if (schoolId) return loadSchoolById(schoolId);
  } catch {
    // No session available in this context.
  }
  return null;
}

/** Like getCurrentSchool() but throws when nothing resolves. */
export async function requireCurrentSchool(): Promise<School> {
  const school = await getCurrentSchool();
  if (!school) throw new Error("No school could be resolved for this request");
  return school;
}
