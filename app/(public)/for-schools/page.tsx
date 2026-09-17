import { FOR_SCHOOLS_METADATA, ForSchoolsLanding } from "./ForSchoolsLanding";

// The SchoolBot sales landing. Also rendered at "/" on the platform host
// (see app/(public)/page.tsx); this route keeps the canonical /for-schools
// URL working everywhere.
export const metadata = FOR_SCHOOLS_METADATA;

export default function ForSchoolsPage() {
  return <ForSchoolsLanding />;
}