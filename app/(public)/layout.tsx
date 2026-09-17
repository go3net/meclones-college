import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { WebsiteChatWidget } from "@/components/WebsiteChatWidget";
import { getSchoolPublic } from "@/lib/tenant";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Schools running portal-only deployments switch their public site
  // off. Every public-route hit bounces straight to the login screen,
  // leaving only /portal/* and /api/* live. The platform fallback
  // (id null, bare schoolbot.com.ng host) is never gated.
  const school = await getSchoolPublic();
  if (school.id && !school.publicSiteEnabled) {
    redirect("/portal/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      {/* Single floating chat — the assistant offers a WhatsApp handoff
          inside the chat itself, so we don't need two competing FABs. */}
      <WebsiteChatWidget />
    </div>
  );
}
