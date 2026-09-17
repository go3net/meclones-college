"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PLATFORM_SCHOOL, type SchoolPublic } from "@/lib/school-public";

/**
 * Hands the current school's public identity to client components.
 * Mounted once in app/layout.tsx from the server-resolved school, so
 * `useSchool()` is the client-side twin of `getSchoolPublic()`.
 */
const SchoolContext = createContext<SchoolPublic>(PLATFORM_SCHOOL);

export function SchoolProvider({ school, children }: { school: SchoolPublic; children: ReactNode }) {
  return <SchoolContext.Provider value={school}>{children}</SchoolContext.Provider>;
}

export function useSchool(): SchoolPublic {
  return useContext(SchoolContext);
}
