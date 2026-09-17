/**
 * The public, serialisable view of a School: identity and contact
 * details only, never credentials. Safe to pass to client components
 * and to embed in emails, PDFs and WhatsApp messages.
 *
 * Shaped like the old `SCHOOL` env-constant object so call sites read
 * the same (`school.phone`, `school.socials.facebook`, ...).
 *
 * No Next.js imports here: client components import the type, scripts
 * import the converter.
 */

import type { School } from "@prisma/client";

export interface SchoolSocials {
  facebook: string;
  instagram: string;
  twitter: string;
  youtube: string;
  linkedin: string;
}

export interface SchoolStats {
  alumni: number;
  teachers: number;
  yearsExperience: number;
}

export interface SchoolPublic {
  /** Null only for the platform fallback (no tenant resolved). */
  id: string | null;
  slug: string;
  /** Admission-number prefix, e.g. "MCL". */
  code: string;
  name: string;
  shortName: string;
  tagline: string;
  address: string;
  addressShort: string;
  phone: string;
  /** E.164 with leading "+", e.g. "+2348060246634". */
  phoneIntl: string;
  email: string;
  admissionsEmail: string;
  /** Digits only, no "+", as wa.me links want it. */
  whatsapp: string;
  hours: string;
  /** Canonical public URL, no trailing slash. */
  website: string;
  socials: SchoolSocials;
  stats: SchoolStats;
  publicSiteEnabled: boolean;
  status: School["status"] | "PLATFORM";
}

const PLATFORM_ROOT = (process.env.PLATFORM_ROOT_DOMAIN ?? "schoolbot.com.ng").trim().toLowerCase();

/**
 * What the platform host (schoolbot.com.ng) and any code path with no
 * tenant get instead of null: SchoolBot's own identity. Keeps every
 * consumer null-free.
 */
export const PLATFORM_SCHOOL: SchoolPublic = {
  id: null,
  slug: "",
  code: "SB",
  name: "SchoolBot",
  shortName: "SchoolBot",
  tagline: "WhatsApp school management for Nigerian schools",
  address: "Lagos, Nigeria",
  addressShort: "Lagos, Nigeria",
  phone: (process.env.PLATFORM_PHONE ?? "0806 024 6634").trim(),
  phoneIntl: (process.env.PLATFORM_PHONE_INTL ?? "+2348060246634").trim(),
  email: (process.env.PLATFORM_EMAIL ?? `hello@${PLATFORM_ROOT}`).trim(),
  admissionsEmail: (process.env.PLATFORM_EMAIL ?? `hello@${PLATFORM_ROOT}`).trim(),
  whatsapp: (process.env.PLATFORM_WHATSAPP ?? "2348060246634").trim(),
  hours: "Mon – Fri, 9:00am – 5:00pm",
  website: `https://${PLATFORM_ROOT}`,
  socials: { facebook: "", instagram: "", twitter: "", youtube: "", linkedin: "" },
  stats: { alumni: 0, teachers: 0, yearsExperience: 0 },
  publicSiteEnabled: true,
  status: "PLATFORM",
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Digits-only form of a phone for wa.me links; Nigerian local -> 234. */
function toWhatsAppDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  if (digits.length === 10) return "234" + digits;
  return digits;
}

/**
 * Canonical public URL for a school: its custom domain if set, else
 * its platform subdomain. Never ends with a slash.
 */
export function schoolBaseUrl(school: Pick<School, "slug" | "customDomain" | "website">): string {
  if (school.customDomain) return `https://${school.customDomain}`;
  if (school.website) return school.website.replace(/\/$/, "");
  return `https://${school.slug}.${PLATFORM_ROOT}`;
}

const DEFAULT_SLUG = (process.env.DEFAULT_SCHOOL_SLUG ?? "meclones").trim().toLowerCase();

/**
 * Base URL to build portal links from (emails, WhatsApp, receipts). No
 * trailing slash. For the default school NEXT_PUBLIC_SITE_URL still wins
 * when set, so the original deployment's links keep working while its
 * custom domain is being wired up; every other school uses its own
 * public URL.
 */
export function schoolSiteUrl(school: SchoolPublic): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (env && school.slug === DEFAULT_SLUG) return env.replace(/\/$/, "");
  return school.website.replace(/\/$/, "");
}

export function toPublicSchool(school: School): SchoolPublic {
  const socials = (school.socials ?? {}) as Partial<Record<keyof SchoolSocials, unknown>>;
  const stats = (school.stats ?? {}) as Partial<Record<keyof SchoolStats, unknown>>;
  const phone = str(school.phone);
  const phoneIntl = str(school.phoneIntl, phone);
  const website = schoolBaseUrl(school);
  const email = str(school.email);

  return {
    id: school.id,
    slug: school.slug,
    code: school.code,
    name: school.name,
    shortName: str(school.shortName, school.name),
    tagline: str(school.tagline),
    address: str(school.address),
    addressShort: str(school.addressShort, str(school.address)),
    phone,
    phoneIntl,
    email,
    admissionsEmail: str(school.admissionsEmail, email),
    whatsapp: toWhatsAppDigits(str(school.whatsapp, phoneIntl)),
    hours: str(school.hours),
    website,
    socials: {
      facebook: str(socials.facebook),
      instagram: str(socials.instagram),
      twitter: str(socials.twitter),
      youtube: str(socials.youtube),
      linkedin: str(socials.linkedin),
    },
    stats: {
      alumni: num(stats.alumni),
      teachers: num(stats.teachers),
      yearsExperience: num(stats.yearsExperience),
    },
    publicSiteEnabled: school.publicSiteEnabled,
    status: school.status,
  };
}
