/**
 * Host -> School resolution (Node only: hits the database).
 *
 * Results are cached in memory for 60s per host so the resolver costs
 * nothing on the hot path. Platform-admin edits that change a slug or
 * custom domain call `invalidateHostCache()`.
 */

import type { School } from "@prisma/client";
import { prismaBase } from "./prisma";
import { DEFAULT_SCHOOL_SLUG, PLATFORM_ROOT_DOMAIN, isPlatformHost, normaliseHost, slugFromHost } from "./host-utils";

export { PLATFORM_ROOT_DOMAIN, DEFAULT_SCHOOL_SLUG, isPlatformHost, normaliseHost, slugFromHost };

const TTL_MS = 60_000;
const cache = new Map<string, { value: School | null; expiresAt: number }>();

function remember(key: string, value: School | null): School | null {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

function recall(key: string): School | null | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

export function invalidateHostCache() {
  cache.clear();
}

/**
 * Resolve the school a request host belongs to. Null means "no tenant":
 * the bare platform host, or an unknown host when no default slug exists.
 */
export async function resolveSchoolByHost(raw: string | null | undefined): Promise<School | null> {
  const host = normaliseHost(raw);
  if (!host || isPlatformHost(host)) return null;

  const key = "host:" + host;
  const cached = recall(key);
  if (cached !== undefined) return cached;

  let school: School | null = null;
  const slug = slugFromHost(host);
  if (slug) {
    school = await prismaBase.school.findUnique({ where: { slug } });
  } else {
    school = await prismaBase.school.findUnique({ where: { customDomain: host } });
    if (!school && DEFAULT_SCHOOL_SLUG) {
      school = await prismaBase.school.findUnique({ where: { slug: DEFAULT_SCHOOL_SLUG } });
    }
  }
  return remember(key, school);
}

/** Load a school by id through the same cache (used for session fallback). */
export async function loadSchoolById(id: string): Promise<School | null> {
  const key = "id:" + id;
  const cached = recall(key);
  if (cached !== undefined) return cached;
  const school = await prismaBase.school.findUnique({ where: { id } });
  return remember(key, school);
}

export async function loadSchoolBySlug(slug: string): Promise<School | null> {
  const clean = slug.trim().toLowerCase();
  if (!clean) return null;
  const key = "slug:" + clean;
  const cached = recall(key);
  if (cached !== undefined) return cached;
  const school = await prismaBase.school.findUnique({ where: { slug: clean } });
  return remember(key, school);
}

/**
 * School owning a Meta WhatsApp phone-number-id. The deployment-level
 * number from env (WHATSAPP_PHONE_NUMBER_ID) belongs to the default
 * school, so a payload with no id, or with the env id, maps there too.
 */
export async function loadSchoolByWhatsAppNumber(phoneNumberId: string | null | undefined): Promise<School | null> {
  const id = phoneNumberId?.trim() ?? "";
  const key = "wa:" + (id || "-");
  const cached = recall(key);
  if (cached !== undefined) return cached;

  let school: School | null = null;
  if (id) school = await prismaBase.school.findUnique({ where: { whatsappPhoneNumberId: id } });
  if (!school) {
    const envId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim();
    if (!id || id === envId) school = await loadSchoolBySlug(DEFAULT_SCHOOL_SLUG);
  }
  return remember(key, school);
}
