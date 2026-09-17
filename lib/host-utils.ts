/**
 * Pure host-name helpers shared by the Edge middleware and the Node
 * resolver. No imports, no database: safe to use anywhere.
 *
 * Host layout of the platform:
 *   schoolbot.com.ng            bare platform host -> SaaS landing, no tenant
 *   www.schoolbot.com.ng        same as the bare host
 *   {slug}.schoolbot.com.ng     that school's site + portal
 *   meclonescollege.com         a school's custom domain (School.customDomain)
 *   anything else               DEFAULT_SCHOOL_SLUG (Railway URL, localhost)
 */

export const PLATFORM_ROOT_DOMAIN = (process.env.PLATFORM_ROOT_DOMAIN ?? "schoolbot.com.ng")
  .trim()
  .toLowerCase();

export const DEFAULT_SCHOOL_SLUG = (process.env.DEFAULT_SCHOOL_SLUG ?? "meclones").trim().toLowerCase();

/**
 * Header the middleware sets on every request with the host the client
 * actually used. Needed because a middleware rewrite (platform root ->
 * /for-schools) replaces the request URL, and with it the `host` server
 * code sees, with the deployment's own hostname. The middleware always
 * overwrites it, so a client-supplied value is never trusted.
 */
export const TENANT_HOST_HEADER = "x-tenant-host";

/** The host a request was really addressed to (see TENANT_HOST_HEADER). */
export function requestHost(h: { get(name: string): string | null }): string {
  return h.get(TENANT_HOST_HEADER) || h.get("host") || h.get("x-forwarded-host") || "";
}

/** Lower-case, strip the port and a leading "www.". */
export function normaliseHost(raw: string | null | undefined): string {
  return (raw ?? "").toLowerCase().split(":")[0].replace(/^www\./, "");
}

/** True for the bare platform host (with or without www). */
export function isPlatformHost(raw: string | null | undefined): boolean {
  return normaliseHost(raw) === PLATFORM_ROOT_DOMAIN;
}

/**
 * "{slug}.<root>" -> "slug". Returns null for the bare root, for hosts
 * outside the root domain, and for nested labels ("a.b.<root>").
 */
export function slugFromHost(raw: string | null | undefined): string | null {
  const host = normaliseHost(raw);
  const suffix = "." + PLATFORM_ROOT_DOMAIN;
  if (!host.endsWith(suffix)) return null;
  const slug = host.slice(0, -suffix.length);
  if (!slug || slug.includes(".")) return null;
  return slug;
}
