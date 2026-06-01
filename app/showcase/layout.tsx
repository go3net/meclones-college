import { redirect } from "next/navigation";
import { PUBLIC_SITE_ENABLED } from "@/lib/constants";

/**
 * /showcase lives outside the (public) route group so each sample
 * school can carry its own header/footer/theme without inheriting
 * Meclones's brand chrome. It is still gated on PUBLIC_SITE_ENABLED
 * so portal-only customer deploys don't expose the sales gallery.
 */
export default function ShowcaseLayout({ children }: { children: React.ReactNode }) {
  if (!PUBLIC_SITE_ENABLED) {
    redirect("/portal/login");
  }
  return <>{children}</>;
}

export const metadata = {
  title: "Sample school websites — see the kind of site we build",
  description: "Three live sample school websites styled completely differently. Click around — every site we build is custom to your brand.",
};
