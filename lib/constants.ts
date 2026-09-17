/**
 * Static academic constants shared by every school on the platform.
 *
 * School identity (name, contact details, admission-number prefix,
 * public-site flag, marketing stats) no longer lives here: it is a
 * `School` row in the database, resolved per request from the host.
 * Server code reads it with `getSchoolPublic()` (lib/tenant.ts), client
 * components with `useSchool()` (components/SchoolProvider.tsx). The
 * original SCHOOL_* env vars only seed the first School row
 * (prisma/backfill-school.js).
 */

/** Years of programs offered. Nigerian-secondary by default; static for now. */
export const PROGRAMS = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"] as const;

export const EXAMS = ["JAMB", "WAEC", "NECO", "IELTS", "SAT", "TOEFL"] as const;
