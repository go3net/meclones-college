/**
 * School-identity constants. Every value can be overridden at deploy
 * time via env vars so the same codebase serves any school. The
 * Meclones defaults stay in place for the canonical deployment.
 *
 * White-label customers set the SCHOOL_* env vars on Railway (or
 * wherever they host) and never touch this file.
 *
 * Stable identifiers used in code (admission-number prefix, default
 * brand colors, etc.) live below the SCHOOL block.
 */

function env(name: string, fallback: string): string {
  return (process.env[name] ?? fallback).trim();
}

export const SCHOOL = {
  name:            env("SCHOOL_NAME",             "Meclones College Lekki"),
  shortName:       env("SCHOOL_SHORT_NAME",       "Meclones College"),
  tagline:         env("SCHOOL_TAGLINE",          "Character. Excellence. Leadership."),
  address:         env("SCHOOL_ADDRESS",          "Plot 19 Road 15, Lekki Atlantic Gardens, Alabeko, Eti Osa, Lagos"),
  addressShort:    env("SCHOOL_ADDRESS_SHORT",    "Plot 19 Road 15, Lekki Atlantic Gardens, Lagos"),
  phone:           env("SCHOOL_PHONE",            "0806 024 6634"),
  phoneIntl:       env("SCHOOL_PHONE_INTL",       "+2348060246634"),
  email:           env("SCHOOL_EMAIL",            "info@meclonescollege.com"),
  admissionsEmail: env("SCHOOL_ADMISSIONS_EMAIL", "admissions@meclonescollege.com"),
  whatsapp:        env("SCHOOL_WHATSAPP",         "2348060246634"),
  hours:           env("SCHOOL_HOURS",            "Mon – Fri, 8:00am – 4:00pm"),
  website:         env("SCHOOL_WEBSITE",          "https://meclonescollege.com"),
  socials: {
    facebook:  env("SCHOOL_FACEBOOK",  "https://facebook.com/meclonescollege"),
    instagram: env("SCHOOL_INSTAGRAM", "https://instagram.com/meclonescollege"),
    twitter:   env("SCHOOL_TWITTER",   "https://twitter.com/meclonescollege"),
    youtube:   env("SCHOOL_YOUTUBE",   "https://youtube.com/@meclonescollege"),
    linkedin:  env("SCHOOL_LINKEDIN",  "https://linkedin.com/company/meclonescollege"),
  },
};

/**
 * Two-to-four-character prefix used at the start of every admission
 * number — e.g. "MCL" → "MCL/SS3A/2526/001". Schools rebrand this when
 * they deploy by setting SCHOOL_CODE.
 */
export const SCHOOL_CODE = env("SCHOOL_CODE", "MCL");

/**
 * Master switch for the marketing site. Schools that already have
 * their own website set ENABLE_PUBLIC_SITE=false on Railway. The "/"
 * route and every page under (public) get bypassed and the root
 * redirects straight to /portal/login.
 */
function readEnableFlag(): boolean {
  const raw = (process.env.ENABLE_PUBLIC_SITE ?? "true").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(raw);
}
export const PUBLIC_SITE_ENABLED = readEnableFlag();

export const STATS = {
  alumni:          Number(env("SCHOOL_STATS_ALUMNI",   "365")),
  teachers:        Number(env("SCHOOL_STATS_TEACHERS", "45")),
  yearsExperience: Number(env("SCHOOL_STATS_YEARS",    "20")),
};

/** Years of programs offered. Nigerian-secondary by default; static for now. */
export const PROGRAMS = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"] as const;

export const EXAMS = ["JAMB", "WAEC", "NECO", "IELTS", "SAT", "TOEFL"] as const;
