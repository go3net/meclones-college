import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui";
import { SCHOOL } from "@/lib/constants";
import { SHARED_IMAGERY } from "@/app/showcase/data";
import { DemoRequestForm } from "./DemoRequestForm";
import {
  Sparkles, CheckCircle2, Users, CreditCard, MessageSquare, BookOpen,
  Shield, FileText, Smartphone, Bot, Building2, ArrowRight, Mail, Phone,
  GraduationCap, Heart, Award, TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "School Portal — software for Nigerian secondary schools",
  description: "A turnkey school-management portal: results, fees, attendance, WhatsApp bot, parent messaging, finance reports. Built with Nigerian schools in mind. Request a demo.",
};

const HEADLINE_FEATURES = [
  {
    icon: Users,
    title: "Student, parent + staff portals",
    body: "Every parent gets a portal showing their child's results, attendance, fees, timetable, and disciplinary record. Teachers and admin get their own role-aware dashboards.",
  },
  {
    icon: CreditCard,
    title: "Paystack-integrated fees",
    body: "Parents pay online; cash / transfer / POS payments are recorded by the accountant. Receipts go out automatically by email and the parent portal.",
  },
  {
    icon: Smartphone,
    title: "WhatsApp bot built-in",
    body: "Parents text the school's WhatsApp number from anywhere, get their child's results, attendance, fee balance, or a Paystack payment link. Auto-recognises parents by phone.",
  },
  {
    icon: Bot,
    title: "AI assistant on your website",
    body: "A chatbot trained on your school's info answers prospective parents 24/7 — admissions, fees, programs, location.",
  },
  {
    icon: FileText,
    title: "Real PDF result slips",
    body: "Server-rendered PDFs auto-attach to result-published emails. Class teacher and principal comments rendered at the bottom of each slip.",
  },
  {
    icon: MessageSquare,
    title: "Parent ↔ teacher messaging",
    body: "Threaded conversations with image + PDF attachments, read receipts, and email + bell notifications when the recipient isn't online.",
  },
  {
    icon: Shield,
    title: "Discipline + health records",
    body: "Formal incident tracking with sanctions and parent acknowledgement. Medical info (blood group, allergies, emergency contact) one tap away in an emergency.",
  },
  {
    icon: TrendingUp,
    title: "Reports + analytics",
    body: "Per-class collection bars, finance PDFs by date range, disciplinary trend dashboards, bulk CSV exports. Off-platform JSON backups to Cloudinary on a schedule.",
  },
];

const TIERS = [
  {
    name: "Starter",
    pitch: "For a single-campus school finding its feet",
    price: "₦80k – 150k",
    period: "/ term",
    features: [
      "1 campus",
      "Up to 300 students",
      "All parent + teacher + admin portals",
      "Paystack online payments",
      "Email + bell notifications",
      "PDF result slips",
      "Manual setup support",
    ],
    cta: "Request demo",
    highlight: false,
  },
  {
    name: "Pro",
    pitch: "Everything a single campus actually uses",
    price: "₦200k – 350k",
    period: "/ term",
    features: [
      "1 campus, unlimited students",
      "Everything in Starter, plus:",
      "WhatsApp Cloud API bot",
      "AI website chatbot",
      "Bulk CSV exports",
      "Scheduled off-platform backups",
      "2FA + recovery codes for staff",
      "Priority email support",
    ],
    cta: "Request demo",
    highlight: true,
  },
  {
    name: "Multi-branch",
    pitch: "For school groups with multiple campuses",
    price: "₦400k – 700k",
    period: "/ term",
    features: [
      "Up to 5 campuses",
      "Everything in Pro, plus:",
      "Branch switcher for staff",
      "Per-branch fee structures",
      "Per-branch announcements",
      "Consolidated owner dashboard",
      "Phone + WhatsApp support",
    ],
    cta: "Request demo",
    highlight: false,
  },
  {
    name: "Enterprise",
    pitch: "For groups with > 5 campuses or special needs",
    price: "Talk to us",
    period: "",
    features: [
      "Unlimited campuses",
      "Custom domain + branding",
      "Custom integrations",
      "Onboarding workshops",
      "Hands-on training for staff",
      "Dedicated support line",
    ],
    cta: "Get in touch",
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Do you replace our existing school website?",
    a: "Only if you want us to. Most schools point a subdomain like portal.yourschool.com at our deployment and keep their existing site untouched. We can also build a new website for you as a separate engagement.",
  },
  {
    q: "How long does onboarding take?",
    a: "From signed agreement to working portal: usually 3-5 working days. That includes setting up your branding, importing your existing student/teacher data, configuring classes + subjects + sessions + fee structures, and training a point-of-contact at the school.",
  },
  {
    q: "What about our existing student data?",
    a: "We import from CSV — name, admission number, class, gender, date of birth, parent name + phone + email. If you currently have it in Excel, you're 90% of the way there. We help with the mapping.",
  },
  {
    q: "Do you take a cut of online payments?",
    a: "No. You configure your own Paystack account; money goes straight to your bank, minus Paystack's own 1.5% fee. We never touch the funds.",
  },
  {
    q: "What if our internet is unreliable?",
    a: "The portal works on any modern phone or browser, including older Android. Paystack lets parents pay via cash / transfer at the office and the accountant records it in seconds. The WhatsApp bot needs Meta credentials but once configured costs effectively nothing.",
  },
  {
    q: "Can we customise the portal to look like our school?",
    a: "Yes — your name, logo, colours, school code (used in admission numbers), tagline, and contact info are all configurable per deployment. For deeper customisation we offer custom development.",
  },
  {
    q: "Who owns our data?",
    a: "You do. We host on Railway with daily Postgres backups; you can export the entire database as JSON or CSV from the director portal whenever you want. If you ever stop using us, you take your data with you — no lock-in.",
  },
];

export default function ForSchoolsPage() {
  return (
    <div className="bg-white">
      {/* Hero with full-bleed photograph */}
      <section
        className="relative text-white overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11,31,75,0.92) 0%, rgba(11,31,75,0.78) 50%, rgba(26,44,90,0.85) 100%), url('${SHARED_IMAGERY.forSchoolsHero}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_#D4A017,transparent_55%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="inline-flex items-center gap-2 bg-gold-400/15 border border-gold-400/40 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Now selling to Nigerian schools
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.06] max-w-4xl drop-shadow-lg">
            The complete portal your school office actually <span className="text-gold-300">runs on.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-100 max-w-2xl leading-relaxed">
            Built with Nigerian schools in mind: Paystack payments, WhatsApp bot, real PDF result slips, parent-teacher messaging, finance reports, multi-branch support. Live in days, not months.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#demo">
              <Button variant="gold" className="text-base px-6 py-3">
                Request a demo <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/showcase">
              <Button variant="outline" className="text-base px-6 py-3 bg-white/5 text-white border-white/30 hover:bg-white/10">
                See sample school sites
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" className="text-base px-6 py-3 bg-white/5 text-white border-white/30 hover:bg-white/10">
                See pricing
              </Button>
            </a>
          </div>

          {/* Trust strip */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl border-t border-white/15 pt-8">
            <div>
              <p className="font-display text-3xl sm:text-4xl font-bold text-gold-300">10+</p>
              <p className="text-xs text-slate-300 mt-1 uppercase tracking-wider">Built-in modules</p>
            </div>
            <div>
              <p className="font-display text-3xl sm:text-4xl font-bold text-gold-300">3–5 days</p>
              <p className="text-xs text-slate-300 mt-1 uppercase tracking-wider">Onboarding</p>
            </div>
            <div>
              <p className="font-display text-3xl sm:text-4xl font-bold text-gold-300">100%</p>
              <p className="text-xs text-slate-300 mt-1 uppercase tracking-wider">Your data, exportable</p>
            </div>
            <div>
              <p className="font-display text-3xl sm:text-4xl font-bold text-gold-300">₦0</p>
              <p className="text-xs text-slate-300 mt-1 uppercase tracking-wider">% of fees taken</p>
            </div>
          </div>
        </div>

        {/* Fade into next section */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* Features grid */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-wide font-semibold text-gold-700 mb-2">What's inside</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900">Everything a school office runs on, in one portal</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Each of these is fully shipped and battle-tested in production. No vapourware modules, no "coming soon".
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HEADLINE_FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-slate-200 hover:border-brand-300 hover:shadow-card rounded-xl p-5 transition-all">
                <div className="h-10 w-10 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-brand-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase strip — link to /showcase */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-100 to-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-gold-700 mb-2">No website yet? We build those too.</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900">Three sample school sites, three different identities</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Every site we build is designed from scratch around your school's brand. Click any of these to tour the full sample site.
            </p>
          </div>

          {/* Three photographic preview cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {[
              { slug: "falcon-academy", name: "Falcon Academy", vibe: "Modern · STEM", img: "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=900&q=80&auto=format&fit=crop", primary: "#0F172A", accent: "#E11D48" },
              { slug: "sunrise-prep", name: "Sunrise Preparatory", vibe: "Classical · Character", img: "https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=900&q=80&auto=format&fit=crop", primary: "#166534", accent: "#D97706" },
              { slug: "northgate-international", name: "Northgate International", vibe: "Premium · Cambridge", img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=900&q=80&auto=format&fit=crop", primary: "#18181B", accent: "#CA8A04" },
            ].map(s => (
              <Link
                key={s.slug}
                href={`/showcase/${s.slug}`}
                className="group rounded-2xl overflow-hidden border border-slate-200 bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className="aspect-[16/10] relative"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${s.primary}CC 0%, ${s.primary}66 100%), url('${s.img}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-semibold px-2 py-1 rounded-full backdrop-blur bg-white/20 mb-2" style={{ color: "#fff" }}>
                      {s.vibe}
                    </span>
                    <p className="font-display text-lg font-bold drop-shadow-md">{s.name}</p>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between bg-white">
                  <span className="text-xs text-slate-500">Sample design</span>
                  <span className="text-sm font-semibold text-brand-700 inline-flex items-center gap-1 group-hover:text-brand-900">
                    Tour <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/showcase">
              <Button variant="primary" className="text-base px-7 py-3">
                Open the full showcase <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-16 sm:py-20 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-wide font-semibold text-gold-700 mb-2">Pricing</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900">Simple per-term pricing. No surprises.</h2>
            <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
              Pick the tier that matches your school size today; switch tiers as you grow. Every plan includes hosting, software updates, and email support.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map(tier => (
              <div
                key={tier.name}
                className={`rounded-xl p-6 flex flex-col ${tier.highlight
                  ? "bg-gradient-to-br from-brand-800 to-brand-900 text-white border-2 border-gold-400 shadow-lift relative"
                  : "bg-white border border-slate-200"}`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-400 text-brand-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-2xl font-bold ${tier.highlight ? "text-gold-300" : "text-brand-900"}`}>{tier.name}</h3>
                <p className={`text-xs mt-1 ${tier.highlight ? "text-slate-300" : "text-slate-500"}`}>{tier.pitch}</p>
                <div className="mt-4">
                  <span className={`text-3xl font-bold ${tier.highlight ? "text-white" : "text-brand-900"}`}>{tier.price}</span>
                  {tier.period && <span className={`text-sm ml-1 ${tier.highlight ? "text-slate-300" : "text-slate-500"}`}>{tier.period}</span>}
                </div>
                <ul className="mt-5 space-y-2 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className={`text-sm flex gap-2 ${tier.highlight ? "text-slate-200" : "text-slate-700"}`}>
                      <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${tier.highlight ? "text-gold-300" : "text-emerald-600"}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#demo" className="mt-6">
                  <Button
                    variant={tier.highlight ? "gold" : "outline"}
                    className="w-full"
                  >
                    {tier.cta} <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500 mt-8 max-w-2xl mx-auto">
            All prices in Naira, per academic term. We can invoice termly, per-session, or annually — whatever suits your finance team. Hosting + Cloudinary + email costs are included in the figures above.
          </p>
        </div>
      </section>

      {/* Sell extras */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gold-700 mb-2">Built for Nigerian schools</p>
              <h2 className="font-display text-3xl font-bold text-brand-900 mb-5">Not another spreadsheet pretending to be a portal</h2>
              <ul className="space-y-3 text-slate-700">
                <li className="flex gap-3"><GraduationCap className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" /><span>The full six-year secondary curriculum — JSS 1 through SS 3 — is wired in from day one. Sessions, terms, promotions, graduation flow built to match how Nigerian schools actually run.</span></li>
                <li className="flex gap-3"><Award className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" /><span>Result slips with CA1 / CA2 / Exam, NECO-style 9-point grading, class teacher + principal comments rendered exactly as your existing template expects.</span></li>
                <li className="flex gap-3"><Heart className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" /><span>Disciplinary records with sanctions, severity, and parent acknowledgement — the same paper trail your office already keeps, but searchable.</span></li>
                <li className="flex gap-3"><Building2 className="h-5 w-5 text-brand-700 shrink-0 mt-0.5" /><span>Multi-campus support: switch branches with one click. Each campus has its own classes, fees, and reports; the owner sees consolidated numbers.</span></li>
              </ul>
            </div>

            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <div
                className="aspect-[4/5] relative"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(11,31,75,0.15) 0%, rgba(11,31,75,0.92) 100%), url('${SHARED_IMAGERY.parentMeeting}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Currently powering
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gold-400 text-brand-900 flex items-center justify-center font-bold font-display text-2xl shrink-0 shadow-lg">M</div>
                    <div>
                      <p className="font-display text-lg font-bold drop-shadow">{SCHOOL.name}</p>
                      <p className="text-xs opacity-80">{SCHOOL.addressShort}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed italic border-l-2 border-gold-400 pl-4 mt-4">
                    "Mose set up our entire portal in a week. Parents love being able to pay fees from their phone and chat directly with class teachers."
                  </p>
                  <p className="text-xs uppercase tracking-wider mt-3 text-gold-300 font-semibold">— Director, {SCHOOL.shortName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo request form */}
      <section
        id="demo"
        className="relative text-white py-16 sm:py-24 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11,31,75,0.96) 0%, rgba(11,31,75,0.88) 100%), url('${SHARED_IMAGERY.classroom}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-wide font-semibold text-gold-300 mb-2">Get started</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold">See it running in your school</h2>
            <p className="mt-3 text-slate-300 max-w-xl mx-auto">
              Fill in the form below and we'll be in touch within 24 hours to set up a free 30-minute walkthrough on Zoom (or in person if you're in Lagos).
            </p>
          </div>

          <DemoRequestForm />

          <div className="mt-10 flex flex-wrap gap-6 justify-center text-sm">
            <a href={`tel:${SCHOOL.phone}`} className="inline-flex items-center gap-2 text-gold-300 hover:text-gold-200">
              <Phone className="h-4 w-4" /> {SCHOOL.phone}
            </a>
            <a href={`mailto:${SCHOOL.admissionsEmail}`} className="inline-flex items-center gap-2 text-gold-300 hover:text-gold-200">
              <Mail className="h-4 w-4" /> {SCHOOL.admissionsEmail}
            </a>
            <a
              href={`https://wa.me/${SCHOOL.whatsapp}?text=${encodeURIComponent("Hi — I run a school and I'd like a demo of the portal.")}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 text-gold-300 hover:text-gold-200"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-wide font-semibold text-gold-700 mb-2">Honest answers</p>
            <h2 className="font-display text-3xl font-bold text-brand-900">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {FAQ.map(item => (
              <details key={item.q} className="bg-white border border-slate-200 rounded-lg group">
                <summary className="cursor-pointer px-5 py-4 font-semibold text-brand-900 flex items-center justify-between list-none">
                  <span>{item.q}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-slate-600 mb-4">Still have questions?</p>
            <Link href="/contact">
              <Button variant="outline">Contact the team <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
