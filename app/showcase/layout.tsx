import { redirect } from "next/navigation";
import { getSchoolPublic } from "@/lib/tenant";

/**
 * /showcase lives outside the (public) route group so each sample
 * school can carry its own header/footer/theme without inheriting
 * Meclones's brand chrome. It is still gated on the school's
 * publicSiteEnabled flag so portal-only customer deploys don't expose
 * the sales gallery (the platform fallback, id null, is never gated).
 */
export default async function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  const school = await getSchoolPublic();
  if (school.id && !school.publicSiteEnabled) {
    redirect("/portal/login");
  }
  return <>{children}</>;
}

export const metadata = {
  title: "Sample school websites — see the kind of site we build",
  description: "Three live sample school websites styled completely differently. Click around — every site we build is custom to your brand.",
};
