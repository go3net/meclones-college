/**
 * Explicit tenant context, carried on AsyncLocalStorage.
 *
 * Request-driven code (server components, actions, route handlers)
 * never touches this directly: `getCurrentSchool()` in lib/tenant.ts
 * works the school out from the host header or the session. This file
 * exists for the entry points that have no request to look at, or
 * whose request belongs to a machine rather than a person:
 *
 *   - Meta / Paystack webhooks (school is derived from the payload)
 *   - cron jobs looping over every school
 *   - the seed script and one-off maintenance scripts
 *   - platform-admin actions that operate on a school other than the
 *     one the request host resolves to
 *
 * Deliberately free of Next.js imports so scripts can use it.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { School } from "@prisma/client";

export interface TenantStore {
  /** Null = explicitly "no tenant" (platform-level work). */
  school: School | null;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

/** Run `fn` with every tenant-scoped query bound to `school`. */
export function runAsSchool<T>(school: School, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ school }, fn);
}

/**
 * Run `fn` with the tenant explicitly cleared. Tenant-model queries
 * inside will be rejected in strict mode; use the unscoped `prismaBase`
 * client for deliberate cross-school work instead.
 */
export function runWithoutTenant<T>(fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ school: null }, fn);
}

/** The explicit store for the current async context, if any was set. */
export function explicitTenant(): TenantStore | undefined {
  return tenantStorage.getStore();
}
