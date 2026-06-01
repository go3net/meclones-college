import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ExternalLink, Layers, Monitor, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { SAMPLE_SCHOOLS } from "./data";

export const metadata: Metadata = {
  title: "Sample school websites — see what we build",
  description: "Three live sample school websites styled completely differently. Click around — every site we build is custom to your brand.",
};

export default function ShowcaseIndexPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top strip back to /for-schools */}
      <div className="bg-brand-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-sm">
          <Link href="/for-schools" className="inline-flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to pitch
          </Link>
          <span className="text-xs text-gold-300 hidden sm:inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> Live sample sites · click around
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold text-gold-700 mb-3">Showcase</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-900 leading-tight max-w-3xl mx-auto">
            See the kind of school websites we build
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Three live sample sites, three completely different identities. Pick one and click around — every site we build is designed from scratch for your school's brand. These are just style directions.
          </p>

          <div className="mt-7 inline-flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2 rounded-full text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            Falcon, Sunrise, and Northgate are fictional. Your site would be designed around <em className="not-italic font-semibold">your</em> name, colours, and story.
          </div>
        </div>
      </section>

      {/* Sample cards */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            {SAMPLE_SCHOOLS.map(s => (
              <Link
                key={s.slug}
                href={`/showcase/${s.slug}`}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white hover:shadow-lift hover:border-slate-300 transition-all flex flex-col"
              >
                {/* Themed preview block — pure colour, no external imagery */}
                <div
                  className="relative h-48 flex items-center justify-center"
                  style={{
                    background:
                      s.vibe === "modern"
                        ? `linear-gradient(135deg, ${s.theme.primary} 0%, #1E293B 100%)`
                        : s.vibe === "classical"
                        ? `linear-gradient(135deg, ${s.theme.primary} 0%, #14532D 60%, ${s.theme.accent} 200%)`
                        : `linear-gradient(135deg, ${s.theme.primary} 0%, #3F3F46 100%)`,
                  }}
                >
                  {/* Monogram crest */}
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center ring-4"
                    style={{
                      backgroundColor: s.theme.accent,
                      color: s.theme.onPrimary,
                      // @ts-expect-error ring colour via inline style
                      "--tw-ring-color": "rgba(255,255,255,0.18)",
                    }}
                  >
                    <span className={`text-4xl font-bold ${s.theme.headingClass}`}>{s.monogram}</span>
                  </div>
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-white/80 bg-white/10 backdrop-blur px-2 py-1 rounded-full">
                    <Layers className="h-3 w-3" />
                    {s.vibe}
                  </span>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs text-slate-500 mb-1">{s.established} · {s.city}</p>
                  <h2 className="font-display text-xl font-bold text-brand-900 group-hover:text-brand-700">{s.name}</h2>
                  <p className="text-sm text-slate-600 mt-2 flex-1 leading-relaxed">{s.cardBlurb}</p>

                  {/* Theme swatches */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">Palette</span>
                    <span className="h-4 w-4 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: s.theme.primary }} />
                    <span className="h-4 w-4 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: s.theme.accent }} />
                    <span className="h-4 w-4 rounded-full ring-1 ring-slate-200" style={{ backgroundColor: s.theme.bg }} />
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
                    Tour this sample <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Split: portal-only OR site + portal */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-wide font-semibold text-gold-700 mb-2">Two ways to buy</p>
            <h2 className="font-display text-3xl font-bold text-brand-900">Already have a school website?</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              No problem. Most schools we work with already have a site. You don't need a new website to use the portal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-7">
              <div className="h-10 w-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                <Monitor className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-900">Portal only</h3>
              <p className="text-sm text-slate-600 mt-2">
                Keep your existing website. We point a subdomain like <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">portal.yourschool.com</code> at the portal. Parents log in from a link on your homepage.
              </p>
              <Link href="/portal/login" className="mt-5 inline-block">
                <Button variant="outline" className="text-sm">
                  Open the portal demo <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <p className="text-xs text-slate-500 mt-3">Demo login: <code className="bg-slate-100 px-1.5 py-0.5 rounded">parent@meclonescollege.com</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded">Meclones123!</code></p>
            </div>

            <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-7 relative">
              <span className="absolute -top-3 right-5 bg-gold-400 text-brand-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                Bundle
              </span>
              <div className="h-10 w-10 rounded-lg bg-brand-700 text-white flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-900">Website + portal</h3>
              <p className="text-sm text-slate-600 mt-2">
                We design and ship your school's public website from scratch — like the three samples above — and wire the portal in behind it. One domain, one bill, one team.
              </p>
              <Link href="/for-schools#demo" className="mt-5 inline-block">
                <Button variant="primary" className="text-sm">
                  Request a bundled demo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <p className="text-xs text-slate-500 mt-3">3–5 working days from go-ahead to live site.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom strip */}
      <section className="py-12 bg-brand-900 text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="font-display text-2xl sm:text-3xl font-bold">Ready to see your school here?</h3>
          <p className="mt-3 text-slate-300">
            Tell us about your school and we'll put together a 30-minute walkthrough — with mock-ups of how your site could look.
          </p>
          <Link href="/for-schools#demo" className="inline-block mt-6">
            <Button variant="gold">
              Book a walkthrough <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
