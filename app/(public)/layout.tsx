import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { WebsiteChatWidget } from "@/components/WebsiteChatWidget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
