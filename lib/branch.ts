/**
 * Multi-branch helpers. Schools that operate a single campus only ever
 * touch the auto-created "Main" branch and never see the UI for it.
 * Multi-branch school groups switch the active branch via a cookie set
 * by the BranchSwitcher in the admin header.
 *
 * Cookie: `branch` — branch id, or empty string for "All branches"
 *         (super-admin / director only).
 */

import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SCHOOL } from "./constants";

const BRANCH_COOKIE = "branch";

/**
 * Make sure the Main branch exists. Called on first admin/director
 * page load. Idempotent — finds-or-creates a row where isMain=true.
 *
 * Returns the Main branch row.
 */
export async function ensureMainBranch() {
  const existing = await prisma.branch.findFirst({ where: { isMain: true } });
  if (existing) return existing;

  return prisma.branch.create({
    data: {
      code: "MAIN",
      name: `${SCHOOL.shortName} — Main`,
      address: SCHOOL.addressShort,
      phone: SCHOOL.phone,
      email: SCHOOL.email,
      isMain: true,
      isActive: true,
    },
  });
}

/**
 * Read the currently-selected branch from the cookie. Returns null
 * when the cookie is unset or set to the special "ALL" value.
 *
 * Always pair with `ensureMainBranch()` for the first call in a
 * request so single-branch deployments have something to attach to.
 */
export function getActiveBranchIdFromCookie(): string | null {
  const v = cookies().get(BRANCH_COOKIE)?.value?.trim();
  if (!v || v === "ALL") return null;
  return v;
}

/**
 * Returns a Prisma where-clause fragment that scopes by the active
 * branch. When no branch is active (super-admin viewing all), returns
 * an empty object so no constraint is added.
 *
 * Use with the spread operator: `where: { ...byActiveBranch(), classId: ... }`
 */
export function byActiveBranch(): { branchId?: string } {
  const id = getActiveBranchIdFromCookie();
  return id ? { branchId: id } : {};
}

/**
 * Resolve the branchId to use when CREATING a new record:
 * 1. If the user has picked a specific branch, use that.
 * 2. Otherwise fall back to the Main branch (auto-creates on first call).
 *
 * Never returns null — new records always get a branch assigned.
 */
export async function resolveBranchIdForCreate(): Promise<string> {
  const picked = getActiveBranchIdFromCookie();
  if (picked) return picked;
  const main = await ensureMainBranch();
  return main.id;
}

/**
 * Convenience: list every active branch (used by the admin
 * BranchSwitcher + the /portal/admin/branches admin page).
 */
export async function listBranches() {
  return prisma.branch.findMany({
    where: { isActive: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });
}

/**
 * Count of active branches. The UI uses this to hide the BranchSwitcher
 * entirely when there's only one — single-branch schools shouldn't see
 * any branch UI at all.
 */
export async function activeBranchCount(): Promise<number> {
  return prisma.branch.count({ where: { isActive: true } });
}
