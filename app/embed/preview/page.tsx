import { getCurrentSchool } from "@/lib/tenant";
import { ensureEmbedKey, embedSnippet } from "@/lib/embed";

export const dynamic = "force-dynamic";

/**
 * /embed/preview — a blank page that loads this school's widget exactly
 * the way a customer's website would (the script tag, nothing else).
 * Resolved from the host, so each school previews its own widget.
 */
export default async function EmbedPreviewPage() {
  const school = await getCurrentSchool();
  if (!school) {
    return (
      <main style={{ fontFamily: "system-ui, sans-serif", padding: 40, color: "#334155" }}>
        <h1 style={{ fontSize: 20 }}>Widget preview</h1>
        <p>Open this page on a school&apos;s own host (its subdomain or custom domain) to preview that school&apos;s widget.</p>
      </main>
    );
  }
  const key = await ensureEmbedKey(school.id);
  const snippet = embedSnippet(key);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 40, color: "#334155", maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>{school.name} — website widget preview</h1>
      <p style={{ marginBottom: 16 }}>
        This page contains nothing but the one-line embed below, so what you see in the corner is exactly what visitors to the school&apos;s own website will get.
      </p>
      <pre style={{ background: "#f1f5f9", padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto" }}>{snippet}</pre>
      <p style={{ fontSize: 13, color: "#64748b" }}>Add <code>data-mode=&quot;whatsapp&quot;</code> for a WhatsApp-only button, or <code>data-position=&quot;left&quot;</code> to move it.</p>
      {/* The widget itself: same path the script is served from in production. */}
      <script src="/embed/v1.js" data-key={key} async />
    </main>
  );
}
