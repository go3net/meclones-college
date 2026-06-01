import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label } from "@/components/ui";
import { LogoUpload } from "@/components/LogoUpload";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { saveBrand, clearBrand } from "./actions";
import { ArrowLeft, Palette, CheckCircle2, AlertCircle, Save, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { saved?: string; cleared?: string; error?: string };

export default async function BrandingPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const brand = await prisma.schoolBrand.findUnique({ where: { id: "default" } });

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/director" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
            <Palette className="h-3.5 w-3.5" /> Branding
          </p>
          <h1 className="text-2xl font-bold text-brand-900">School logo &amp; brand colours</h1>
          <p className="text-sm text-slate-500">
            Upload your school's logo and pick brand colours. These override the portal's default styling everywhere.
          </p>
        </div>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Branding saved. Refresh other tabs to see it.
        </div>
      )}
      {searchParams.cleared && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <Trash2 className="h-4 w-4" /> Branding reset to defaults.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action={saveBrand}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Logo</CardTitle></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label>Wide logo (header)</Label>
                <p className="text-xs text-slate-500 mb-2">Used in the public header + portal sidebar. Roughly 200×60.</p>
                <LogoUpload name="logoUrl" defaultUrl={brand?.logoUrl} label="Wide logo" shape="wide" />
              </div>
              <div>
                <Label>Square logo (favicon / mobile)</Label>
                <p className="text-xs text-slate-500 mb-2">Used as the small icon in compact layouts. 1:1 ratio.</p>
                <LogoUpload name="logoSquareUrl" defaultUrl={brand?.logoSquareUrl} label="Square logo" shape="square" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="mb-4">
          <CardHeader><CardTitle><Palette className="h-4 w-4 inline mr-1" /> Brand colours</CardTitle></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <Label>Primary colour</Label>
                <p className="text-xs text-slate-500 mb-2">Hex like <code className="bg-slate-100 px-1 rounded">#0B1F4B</code>. Used for header, buttons, and badges across the portal.</p>
                <div className="flex items-center gap-2">
                  <Input
                    name="primaryHex"
                    defaultValue={brand?.primaryHex ?? ""}
                    placeholder="#0B1F4B"
                    pattern="^#?[0-9a-fA-F]{6}$"
                    className="font-mono"
                  />
                  <div
                    className="h-9 w-9 rounded-lg border border-slate-200"
                    style={{ backgroundColor: brand?.primaryHex ?? "#0B1F4B" }}
                  />
                </div>
              </div>
              <div>
                <Label>Accent colour</Label>
                <p className="text-xs text-slate-500 mb-2">Hex like <code className="bg-slate-100 px-1 rounded">#D4A017</code>. Used for highlights, CTAs, and award badges.</p>
                <div className="flex items-center gap-2">
                  <Input
                    name="accentHex"
                    defaultValue={brand?.accentHex ?? ""}
                    placeholder="#D4A017"
                    pattern="^#?[0-9a-fA-F]{6}$"
                    className="font-mono"
                  />
                  <div
                    className="h-9 w-9 rounded-lg border border-slate-200"
                    style={{ backgroundColor: brand?.accentHex ?? "#D4A017" }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Leave any field blank to fall back to the system default (navy + gold).
            </p>
          </CardBody>
        </Card>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <form action={clearBrand}>
            <Button type="submit" variant="outline" className="text-rose-700 border-rose-200 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Reset to defaults
            </Button>
          </form>
          <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save branding</Button>
        </div>
      </form>

      <p className="text-xs text-slate-500 mt-6">
        💡 Tip: brand colour changes apply globally on the next page load. Logos appear immediately in the header and on result-slip PDFs from the next generation onwards.
      </p>
    </PortalShell>
  );
}
