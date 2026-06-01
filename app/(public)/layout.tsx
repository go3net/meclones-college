import { redirect } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { WebsiteChatWidget } from "@/components/WebsiteChatWidget";
import { PUBLIC_SITE_ENABLED } from "@/lib/constants";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // White-label customers running portal-only deployments set
  // ENABLE_PUBLIC_SITE=false. Every public-route hit bounces straight
  // to the login screen, leaving only /portal/* and /api/* live.
  if (!PUBLIC_SITE_ENABLED) {
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
