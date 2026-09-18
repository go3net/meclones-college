/**
 * Embeddable website widget: keys, origin allowlist and CORS.
 *
 * A school with its own website pastes one script tag:
 *   <script src="https://schoolbot.com.ng/embed/v1.js" data-key="sb_…" async></script>
 * The script (embed/widget.js) calls /api/embed/config and /api/embed/chat
 * on the platform with that key. The key is public and only selects the
 * school; abuse is limited by the per-school origin allowlist and the
 * per-key rate limit.
 */

import { randomBytes } from "node:crypto";
import type { School } from "@prisma/client";
import { prismaBase } from "./prisma";
import { PLATFORM_ROOT_DOMAIN } from "./host-utils";

export const EMBED_KEY_PREFIX = "sb_";

export function generateEmbedKey(): string {
  return EMBED_KEY_PREFIX + randomBytes(18).toString("base64url");
}

/** Make sure a school has a key; returns the (possibly new) key. */
export async function ensureEmbedKey(schoolId: string): Promise<string> {
  const existing = await prismaBase.school.findUnique({ where: { id: schoolId }, select: { embedKey: true } });
  if (existing?.embedKey) return existing.embedKey;
  const updated = await prismaBase.school.update({ where: { id: schoolId }, data: { embedKey: generateEmbedKey() } });
  return updated.embedKey!;
}

// 60s cache so a busy customer site doesn't hit the DB per widget load.
const cache = new Map<string, { value: School | null; expiresAt: number }>();
const TTL_MS = 60_000;

export function invalidateEmbedCache() {
  cache.clear();
}

export async function loadSchoolByEmbedKey(key: string | null | undefined): Promise<School | null> {
  const clean = (key ?? "").trim();
  if (!clean.startsWith(EMBED_KEY_PREFIX) || clean.length > 80) return null;
  const hit = cache.get(clean);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const school = await prismaBase.school.findUnique({ where: { embedKey: clean } });
  cache.set(clean, { value: school, expiresAt: Date.now() + TTL_MS });
  return school;
}

/** Normalise a stored/entered origin: scheme + host, lower-case, no path. */
export function normaliseOrigin(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    return `${u.protocol}//${u.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export function allowedOrigins(school: Pick<School, "embedAllowedOrigins">): string[] {
  const raw = school.embedAllowedOrigins;
  if (!Array.isArray(raw)) return [];
  return raw.filter((o): o is string => typeof o === "string").map(o => o.toLowerCase());
}

/**
 * Is a browser origin allowed to use this school's widget?
 * - Empty allowlist: any origin (simple onboarding; tighten later).
 * - Otherwise the origin must match exactly, or be a subdomain of an
 *   entry (entry "https://school.com" also allows "https://www.school.com").
 * - No Origin header (curl, same-origin GET) is allowed only when the
 *   allowlist is empty.
 */
export function originAllowed(school: Pick<School, "embedAllowedOrigins">, origin: string | null): boolean {
  const list = allowedOrigins(school);
  if (list.length === 0) return true;
  if (!origin) return false;
  const o = origin.toLowerCase();
  let oHost: string;
  let oProto: string;
  try {
    const u = new URL(o);
    oHost = u.host;
    oProto = u.protocol;
  } catch {
    return false;
  }
  return list.some(entry => {
    if (entry === o) return true;
    try {
      const e = new URL(entry);
      return e.protocol === oProto && oHost.endsWith("." + e.host);
    } catch {
      return false;
    }
  });
}

export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function embedScriptUrl(): string {
  return `https://${PLATFORM_ROOT_DOMAIN}/embed/v1.js`;
}

export function embedSnippet(key: string): string {
  return `<script src="${embedScriptUrl()}" data-key="${key}" async></script>`;
}
