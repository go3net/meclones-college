import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Label, Textarea } from "@/components/ui";
import { requireRole } from "@/lib/auth-helpers";
import { requireCurrentSchool } from "@/lib/tenant";
import { allowedOrigins, embedSnippet, ensureEmbedKey } from "@/lib/embed";
import { saveWidgetSettings, regenerateEmbedKey } from "./actions";
import { ArrowLeft, Code2, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string; regenerated?: string; error?: string };

export default async function WebsiteWidgetPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);
  const school = await requireCurrentSchool();
  const key = await ensureEmbedKey(school.id);
  const snippet = embedSnippet(key);
  const origins = allowedOrigins(school);

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-start gap-3">
        <Link href="/portal/director" className="text-slate-500 hover:text-brand-700 mt-1" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
            <Code2 className="h-3.5 w-3.5" /> Your existing website
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Website widget</h1>
          <p className="text-sm text-slate-500">
            Put the school&apos;s WhatsApp line and the AI assistant on your own website. Paste one line of code; everything else is managed here.
          </p>
        </div>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Settings saved.
        </div>
      )}
      {searchParams.regenerated && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> New key issued. Update the code on your website; the old snippet no longer works.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1 · Paste this on your website</CardTitle>
          <Badge tone={school.embedEnabled ? "gold" : "danger"}>{school.embedEnabled ? "Widget on" : "Widget off"}</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-600 mb-3">
            Add the line below just before <code className="bg-slate-100 px-1 rounded">&lt;/body&gt;</code> on every page (or in your site&apos;s footer template). Works with WordPress, Wix, Squarespace, Webflow and hand-built sites.
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto select-all">{snippet}</pre>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <a href="/embed/preview" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
              <ExternalLink className="h-4 w-4" /> Preview the widget on a blank page
            </a>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Default: assistant + WhatsApp</p>
              <p>A &quot;Chat with us&quot; button opens the AI assistant (answers from your Chatbot KB) with a WhatsApp handoff link.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800 mb-1">Options</p>
              <p><code className="bg-slate-100 px-1 rounded">data-mode=&quot;whatsapp&quot;</code> for a WhatsApp-only button · <code className="bg-slate-100 px-1 rounded">data-position=&quot;left&quot;</code> to move it · <code className="bg-slate-100 px-1 rounded">data-color=&quot;#hex&quot;</code> to recolour.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2 · Settings</CardTitle>
          <Badge tone="neutral">{origins.length === 0 ? "Any website" : `${origins.length} allowed`}</Badge>
        </CardHeader>
        <CardBody>
          <form action={saveWidgetSettings} className="space-y-4 text-sm">
            <label className="inline-flex items-center gap-2 text-slate-700">
              <input type="checkbox" name="embedEnabled" defaultChecked={school.embedEnabled} className="h-4 w-4" />
              Widget enabled
            </label>
            <div>
              <Label>Websites allowed to show the widget (one per line)</Label>
              <Textarea name="origins" rows={4} defaultValue={origins.join("\n")} placeholder={"https://www.yourschool.com\nhttps://yourschool.com"} />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave empty to allow any website. Once set, only these sites (and their subdomains) can load your widget or use your assistant.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="gold">Save settings</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3 · Key</CardTitle>
          <Badge tone="neutral" className="font-mono">{key}</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-600 mb-3">
            The key only identifies your school; it is not a secret. If it is being misused, issue a new one and update your website.
          </p>
          <form action={regenerateEmbedKey}>
            <Button type="submit" variant="outline"><RefreshCw className="h-4 w-4" /> Issue a new key</Button>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
