import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft, ExternalLink, Layers, Monitor, Sparkles, Eye, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui";
import { SAMPLE_SCHOOLS, SHARED_IMAGERY, hexAlpha } from "./data";

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

      {/* Hero with real imagery */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11,31,75,0.92) 0%, rgba(11,31,75,0.78) 50%, rgba(26,44,90,0.85) 100%), url('${SHARED_IMAGERY.showcaseHero}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-white">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 text-gold-300 border border-gold-400/30 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur">
            <Eye className="h-3.5 w-3.5" /> Live showcase · 3 sample school sites
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] max-w-4xl">
            See the kind of school websites <span className="text-gold-300">we build.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-200 max-w-2xl leading-relaxed">
            Three completely different live sample sites. Pick one and click around — every site we build is designed from scratch around your school's brand. These are just style directions.
          </p>
          <div className="mt-9 inline-flex items-center gap-2 bg-amber-400/15 border border-amber-300/30 text-amber-100 px-4 py-2.5 rounded-xl text-sm font-medium backdrop-blur">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Falcon, Sunrise & Northgate are fictional. <em className="not-italic font-semibold ml-1">Your school's site would be designed around your name, colours, and story.</em>
          </div>
        </div>

        {/* Decorative bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
      </section>

      {/* Sample cards — image-first */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {SAMPLE_SCHOOLS.map(s => (
              <Link
                key={s.slug}
                href={`/showcase/${s.slug}`}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                {/* Photo with crest overlay */}
                <div
                  className="relative h-56 sm:h-64"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${hexAlpha(s.theme.primary, 0.78)} 0%, ${hexAlpha(s.theme.primary, 0.45)} 100%), url('${s.imagery.card}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-white/95 bg-black/30 backdrop-blur px-2.5 py-1 rounded-full ring-1 ring-white/20"
                  >
                    <Layers className="h-3 w-3" />
                    {s.vibe}
                  </span>

                  {/* Crest at bottom-left */}
                  <div className="absolute bottom-4 left-4 flex items-center gap-3">
                    <div
                      className="h-14 w-14 rounded-xl flex items-center justify-center ring-2 ring-white/30 shadow-xl shrink-0"
                      style={{ backgroundColor: s.theme.accent, color: s.theme.primary }}
                    >
                      <span className={`text-2xl ${s.theme.headingClass}`}>{s.monogram}</span>
                    </div>
                    <div className="text-white">
                      <p className={`text-lg leading-tight ${s.theme.headingClass}`}>{s.shortName}</p>
                      <p className="text-[10px] uppercase tracking-[0.15em] opacity-80">{s.established}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="font-display text-xl font-bold text-brand-900 group-hover:text-brand-700">{s.name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{s.city}, {s.state}</p>
                  <p className="text-sm text-slate-600 mt-3 flex-1 leading-relaxed">{s.cardBlurb}</p>

                  {/* Theme swatches */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Palette</span>
                      <span className="h-5 w-5 rounded-full ring-2 ring-slate-100" style={{ backgroundColor: s.theme.primary }} />
                      <span className="h-5 w-5 rounded-full ring-2 ring-slate-100" style={{ backgroundColor: s.theme.accent }} />
                      <span className="h-5 w-5 rounded-full ring-2 ring-slate-100" style={{ backgroundColor: s.theme.bg, border: "1px solid rgba(0,0,0,0.08)" }} />
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
                      Tour <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reassurance band — built from scratch */}
      <section className="py-16 bg-gradient-to-br from-slate-100 to-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold text-gold-700 mb-3">Designed from scratch</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900 leading-tight">
                You'd never recognise your site in someone else's.
              </h2>
              <p className="mt-4 text-slate-700 leading-relaxed">
                These three samples exist to show you the <em>range</em> of what we build — from sharp modern STEM schools to traditional preparatory schools to premium Cambridge pathways. None of them is a template. Your site starts with a conversation about your school's story.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Your photography, your students, your campus — not stock.",
                  "Your typography, your colour palette, your house crests.",
                  "Your structure — admissions, programs, news, leadership pages built around what your school actually does.",
                ].map(line => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="h-2 w-2 rounded-full bg-brand-700 mt-2 shrink-0" />
                    <span className="text-sm text-slate-700">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="aspect-[4/5] rounded-2xl shadow-2xl relative overflow-hidden"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(11,31,75,0) 30%, rgba(11,31,75,0.85) 100%), url('${SHARED_IMAGERY.classroom}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="font-display text-xl leading-tight">"We don't recycle. Every brief starts blank."</p>
                <p className="text-xs opacity-80 mt-2 uppercase tracking-wider">— Mose, founder</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Split: portal-only OR site + portal */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-gold-700 mb-2">Two ways to buy</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900">Already have a school website?</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              No problem. Most schools we work with already have a site. You don't need a new website to use the portal.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-7 hover:shadow-lg transition-shadow">
              <div className="h-11 w-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-4">
                <Monitor className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-900">Portal only</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Keep your existing website. We point a subdomain like <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">portal.yourschool.com</code> at the portal. Parents log in from a link on your homepage.
              </p>
              <Link href="/portal/login" className="mt-5 inline-block">
                <Button variant="outline" className="text-sm">
                  Open the portal demo <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <p className="text-xs text-slate-500 mt-3">Demo login: <code className="bg-slate-100 px-1.5 py-0.5 rounded">parent@meclonescollege.com</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded">Meclones123!</code></p>
            </div>

            <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white p-7 relative hover:shadow-lg transition-shadow">
              <span className="absolute -top-3 right-5 bg-gold-400 text-brand-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow">
                Bundle
              </span>
              <div className="h-11 w-11 rounded-lg bg-brand-700 text-white flex items-center justify-center mb-4">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold text-brand-900">Website + portal</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
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

      {/* Bottom CTA */}
      <section
        className="relative py-20 text-white overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11,31,75,0.92) 0%, rgba(11,31,75,0.7) 100%), url('${SHARED_IMAGERY.campusLife}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h3 className="font-display text-3xl sm:text-4xl font-bold leading-tight">
            Ready to see <span className="text-gold-300">your school</span> here?
          </h3>
          <p className="mt-4 text-slate-200 leading-relaxed">
            Tell us about your school and we'll put together a 30-minute walkthrough — with mock-ups of how your site could look.
          </p>
          <Link href="/for-schools#demo" className="inline-block mt-7">
            <Button variant="gold" className="text-base px-6 py-3">
              Book a walkthrough <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

