/**
 * Per-user email notification preferences. Backed by NotificationPrefs
 * model — lazy-created on first toggle, so an absent row means "all on".
 *
 * Critical safety emails are NEVER opt-out-able and don't route through
 * this module: password reset, welcome, payment receipt, and the initial
 * disciplinary case filing. Add any others to the SAFETY_ALWAYS_ON note
 * in the settings page docstring before plumbing them through here.
 */

import { prisma } from "./prisma";

export type PrefKey =
  | "emailResultsPublished"
  | "emailFeeCharged"
  | "emailDisciplinaryResolved"
  | "emailNewMessage"
  | "emailAnnouncement"
  | "emailComplaintReplied";

const DEFAULTS: Record<PrefKey, boolean> = {
  emailResultsPublished: true,
  emailFeeCharged: true,
  emailDisciplinaryResolved: true,
  emailNewMessage: true,
  emailAnnouncement: true,
  emailComplaintReplied: true,
};

export const PREF_LABELS: Record<PrefKey, { label: string; help: string }> = {
  emailResultsPublished: {
    label: "Results published",
    help: "Email when termly results are published for you or your child.",
  },
  emailFeeCharged: {
    label: "New fees",
    help: "Email when the school adds a new fee to your child's account.",
  },
  emailDisciplinaryResolved: {
    label: "Disciplinary case resolved",
    help: "Email when a disciplinary case for your child is formally closed.",
  },
  emailNewMessage: {
    label: "New conversation",
    help: "Email on the first message of a new parent ↔ teacher thread (replies never email).",
  },
  emailAnnouncement: {
    label: "Announcements",
    help: "Email when the school publishes an announcement to your audience.",
  },
  emailComplaintReplied: {
    label: "Complaint resolved",
    help: "Email when the school responds to a complaint you filed.",
  },
};

/**
 * Check whether the user has the given email preference enabled. Missing
 * row → returns the default (true for every type listed here).
 *
 * Best-effort: any DB hiccup returns true, so users still receive critical
 * comms rather than going silent due to infra problems.
 */
export async function canEmail(userId: string, key: PrefKey): Promise<boolean> {
  try {
    const prefs = await prisma.notificationPrefs.findUnique({ where: { userId } });
    if (!prefs) return DEFAULTS[key];
    return Boolean((prefs as unknown as Record<PrefKey, boolean>)[key]);
  } catch (err) {
    console.error("[prefs] canEmail check failed — falling back to default", err);
    return DEFAULTS[key];
  }
}

/**
 * Variant for when the caller has already fetched the prefs row (e.g.
 * via Prisma include). Returns the default if `prefs` is null/undefined.
 */
export function canEmailFromRow(
  prefs: Partial<Record<PrefKey, boolean>> | null | undefined,
  key: PrefKey,
): boolean {
  if (!prefs) return DEFAULTS[key];
  const v = prefs[key];
  return v === undefined || v === null ? DEFAULTS[key] : Boolean(v);
}

/** Lazy-create a prefs row for the user; returns the row. */
export async function getOrCreatePrefs(userId: string) {
  const existing = await prisma.notificationPrefs.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.notificationPrefs.create({ data: { userId } });
}

export const PREF_KEYS: PrefKey[] = [
  "emailResultsPublished",
  "emailFeeCharged",
  "emailDisciplinaryResolved",
  "emailNewMessage",
  "emailAnnouncement",
  "emailComplaintReplied",
];
