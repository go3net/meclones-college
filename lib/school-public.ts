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
  /**
   * Where THIS PLATFORM serves the school: its custom domain or its
   * `{slug}.<root>` subdomain. Every `/portal/...`, `/api/...` and
   * `/embed/...` link must be built from this. No trailing slash.
   */
  portalUrl: string;
  /**
   * The school's marketing website. For a COMPLETE school that is the
   * site we serve (same as portalUrl); for a PORTAL-only school it is
   * their own existing website (falls back to portalUrl if unknown).
   * No trailing slash.
   */
  website: string;
  /**
   * Where "back to website" links go from the portal: "/" for a COMPLETE
   * school, the school's own site for PORTAL-only, "" when unknown (hide
   * the link).
   */
  homeUrl: string;
  /**
   * What the school bought. COMPLETE = website + portal + WhatsApp;
   * PORTAL = portal + WhatsApp + the embeddable widget for their own site.
   */
  package: SchoolPackage;
  /**
   * Show the click-to-fill demo accounts on the login page. Only ever
   * true for the designated demo school (DEMO_SCHOOL_SLUG, defaulting to
   * the default school); never for a customer.
   */
  demoLogins: boolean;
  socials: SchoolSocials;
  stats: SchoolStats;
  /** True for COMPLETE. Kept as its own flag because pages gate on it. */
  publicSiteEnabled: boolean;
  status: School["status"] | "PLATFORM";
}

export type SchoolPackage = "COMPLETE" | "PORTAL";

export const PACKAGE_LABEL: Record<SchoolPackage, string> = {
  COMPLETE: "Complete (website + portal)",
  PORTAL: "Portal only (own website)",
};

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
  portalUrl: `https://${PLATFORM_ROOT}`,
  website: `https://${PLATFORM_ROOT}`,
  homeUrl: "/",
  package: "COMPLETE",
  demoLogins: false,
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

const DEFAULT_SLUG = (process.env.DEFAULT_SCHOOL_SLUG ?? "meclones").trim().toLowerCase();
/** The one school whose login page offers demo accounts. "" disables it. */
const DEMO_SLUG = (process.env.DEMO_SCHOOL_SLUG ?? DEFAULT_SLUG).trim().toLowerCase();

/**
 * Where this platform serves a school (portal, APIs, and the website too
 * for COMPLETE schools): its custom domain if set, else its platform
 * subdomain. Deliberately ignores School.website, which for a PORTAL-only
 * school is a site we do not host. For the default school
 * NEXT_PUBLIC_SITE_URL still wins when set, so the original deployment's
 * links keep working while its custom domain is being wired up.
 */
export function schoolPortalUrl(school: Pick<School, "slug" | "customDomain">): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (env && school.slug === DEFAULT_SLUG) return env.replace(/\/$/, "");
  if (school.customDomain) return `https://${school.customDomain}`;
  return `https://${school.slug}.${PLATFORM_ROOT}`;
}

/** What the school bought, from the stored plan or the public-site flag. */
export function schoolPackage(school: Pick<School, "plan" | "publicSiteEnabled">): SchoolPackage {
  if (school.plan === "PORTAL" || school.plan === "COMPLETE") return school.plan;
  return school.publicSiteEnabled ? "COMPLETE" : "PORTAL";
}

/**
 * Base URL to build portal links from (emails, WhatsApp, receipts, the
 * Paystack callback). Same as `school.portalUrl`; kept as a function
 * because many call sites already use it.
 */
export function schoolSiteUrl(school: SchoolPublic): string {
  return school.portalUrl;
}

/** How a family applies: our /apply page only exists for COMPLETE schools. */
export function applyInstruction(school: SchoolPublic): string {
  return school.publicSiteEnabled
    ? `Apply online at ${school.website}/apply`
    : `Request an admission form from the admissions office (${school.admissionsEmail || school.email} or ${school.phone})`;
}

/** How a family books a tour: /book-visit only exists for COMPLETE schools. */
export function tourInstruction(school: SchoolPublic): string {
  return school.publicSiteEnabled
    ? `book a guided tour at ${school.website}/book-visit`
    : `arrange a guided tour by emailing ${school.admissionsEmail || school.email}`;
}

export function toPublicSchool(school: School): SchoolPublic {
  const socials = (school.socials ?? {}) as Partial<Record<keyof SchoolSocials, unknown>>;
  const stats = (school.stats ?? {}) as Partial<Record<keyof SchoolStats, unknown>>;
  const phone = str(school.phone);
  const phoneIntl = str(school.phoneIntl, phone);
  const email = str(school.email);
  const portalUrl = schoolPortalUrl(school);
  const pkg = schoolPackage(school);
  const hasPublicSite = pkg === "COMPLETE";
  const ownWebsite = str(school.website).replace(/\/$/, "");
  // COMPLETE: we serve the website. PORTAL: the school's own site.
  const website = hasPublicSite ? portalUrl : (ownWebsite || portalUrl);
  const homeUrl = hasPublicSite ? "/" : ownWebsite;

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
    portalUrl,
    website,
    homeUrl,
    package: pkg,
    demoLogins: DEMO_SLUG !== "" && school.slug === DEMO_SLUG,
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
    publicSiteEnabled: hasPublicSite,
    status: school.status,
  };
}
