import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui";
import { WhatsAppMockup } from "@/components/WhatsAppMockup";
import { WHATSAPP_FLOWS } from "@/lib/whatsapp-flows";
import { SHARED_IMAGERY } from "@/app/showcase/data";
import {
  ArrowRight, Sparkles, MessageCircle, CheckCircle2, Smartphone,
  AlertCircle, Globe2, Zap, ShieldCheck, Star,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Your school runs on WhatsApp — not a portal",
  description: "We built the only school management system Nigerian parents and teachers don't have to learn. Everything happens in WhatsApp — payments, results, attendance, scores, messaging, discipline.",
};

const TRUST_LINES = [
  "No app to install",
  "No portal to learn",
  "No training day",
  "Works on every phone",
];

const COMPARE = [
  {
    label: "Traditional school portal",
    icon: AlertCircle,
    tone: "bad",
    rows: [
      "Parents forget the URL",
      "Forget the password every term",
      "Open the app once a year, in panic",
      "Teachers refuse to learn it",
      "Admin chases them with WhatsApp screenshots",
    ],
  },
  {
    label: "Mobile app (iOS + Android)",
    icon: Smartphone,
    tone: "mid",
    rows: [
      "App-store install friction",
      "Updates parents ignore",
      "Some parents have feature phones",
      "Notifications get silenced",
      "Storage / battery complaints",
    ],
  },
  {
    label: "Your school in WhatsApp",
    icon: MessageCircle,
    tone: "good",
    rows: [
      "Every parent already has WhatsApp",
      "Every teacher already opens it 100× a day",
      "No new password, no install, no training",
      "Read receipts + replies are second nature",
      "Works on the oldest Android phone you can find",
    ],
  },
];

const ROLE_LIST = [
  {
    label: "Parents do everything from WhatsApp",
    icon: "👨‍👩‍👧",
    items: [
      "Check this term's results (PDF slip on demand)",
      "See today's attendance",
      "Check fee balance + pay via Paystack link",
      "View timetable for any day",
      "See homework due, assignments, marks",
      "Read disciplinary record + acknowledge incidents",
      "Update child's medical info / emergency contact",
      "Message any teacher (forwarded into portal, logged)",
      "RSVP to events, see announcements",
      "Request transcripts, receipts, leave letters",
    ],
  },
  {
    label: "Teachers do everything from WhatsApp",
    icon: "👩‍🏫",
    items: [
      "Mark daily attendance with a tap-list",
      "Enter CA1 / CA2 / Exam scores subject-by-subject",
      "Log disciplinary incidents (severity + sanction)",
      "Send class-wide announcement to all parents",
      "Reply to parent messages from WhatsApp inbox",
      "Mark assignments as graded",
      "Check own timetable / request leave",
      "Submit weekly lesson plan summary",
      "Receive new-student alerts when promoted in",
      "Get reminded about pending grading & comments",
    ],
  },
];

export default function WhatsAppLandingPage() {
  return (
    <div className="bg-white">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <Image src={SHARED_IMAGERY.parentMeeting} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-900/86 to-emerald-900/55" />
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 85% 20%, #25D366, transparent 55%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-400/15 border border-emerald-300/40 text-emerald-200 px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur mb-6">
                <MessageCircle className="h-3.5 w-3.5" /> The school management product schools actually use
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.04] drop-shadow-lg">
                Your school <br className="hidden sm:block" />
                runs on <span className="text-emerald-300">WhatsApp.</span>
              </h1>
              <p className="mt-7 text-lg sm:text-xl text-slate-200 leading-relaxed max-w-xl">
                Parents check results, pay fees, message teachers — all from the WhatsApp they already use 100 times a day. Teachers take attendance, enter scores, log incidents — without ever opening a browser.
              </p>
              <p className="mt-3 text-base text-slate-300 max-w-xl">
                <span className="text-gold-300 font-semibold">No app to install. No portal to learn. No training day.</span> If your staff can send a WhatsApp message, they can run your school.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/for-schools#demo">
                  <Button variant="gold" className="text-base px-6 py-3.5">
                    Request a demo <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#flows">
                  <Button variant="outline" className="text-base px-6 py-3.5 bg-white/5 text-white border-white/30 hover:bg-white/10">
                    See it in action
                  </Button>
                </a>
              </div>

              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
                {TRUST_LINES.map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                    <span className="text-slate-200">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero phone mockup */}
            <div className="hidden lg:block">
              <WhatsAppMockup
                peerName="Falcon Academy"
                peerStatus="online · school office"
                peerMonogram="F"
                peerAvatarColor="#E11D48"
                messages={WHATSAPP_FLOWS[0].messages.slice(0, 9)}
                showInput
              />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
      </section>

      {/* ===== THE PROBLEM ===== */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold text-gold-700 mb-3">The Nigerian school problem</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-900 leading-tight">
            Schools don't fail at software <em className="italic text-brand-700">because it's complex.</em>
            <br className="hidden sm:block" />
            They fail because <span className="text-rose-600">no one wants to learn it.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Every Nigerian school portal we've ever audited has the same story. The director signed the contract. The accountant logged in once. The form teachers never did. Parents got the URL via WhatsApp screenshot and never typed it. Six months later the school is back to broadsheets and bank tellers.
          </p>
          <p className="mt-6 text-lg text-slate-700 font-semibold max-w-3xl mx-auto">
            We solved it by going where the school already lives.
          </p>
        </div>
      </section>

      {/* ===== COMPARE BAND ===== */}
      <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-gold-700 mb-2">Honest comparison</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900">What schools have tried</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {COMPARE.map(c => {
              const tone =
                c.tone === "bad" ? "border-rose-200 bg-rose-50/40"
                : c.tone === "mid" ? "border-amber-200 bg-amber-50/40"
                : "border-emerald-200 bg-emerald-50/50 ring-2 ring-emerald-300/30 shadow-lg";
              const accent =
                c.tone === "bad" ? "text-rose-600 bg-rose-100"
                : c.tone === "mid" ? "text-amber-600 bg-amber-100"
                : "text-emerald-700 bg-emerald-100";
              return (
                <div key={c.label} className={`rounded-2xl border-2 p-6 ${tone}`}>
                  {c.tone === "good" && (
                    <span className="absolute -mt-9 ml-auto mr-auto inline-flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      <Star className="h-3 w-3 fill-white" /> What we do
                    </span>
                  )}
                  <div className={`h-11 w-11 rounded-lg flex items-center justify-center mb-4 ${accent}`}>
                    <c.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-brand-900 mb-4">{c.label}</h3>
                  <ul className="space-y-2">
                    {c.rows.map(r => (
                      <li key={r} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${c.tone === "good" ? "bg-emerald-600" : c.tone === "mid" ? "bg-amber-500" : "bg-rose-500"}`} />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== THE FLOWS — alternating ===== */}
      <section id="flows" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-emerald-700 mb-3">See it in action</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-brand-900 leading-tight">
              Six conversations that replace your portal
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              Real WhatsApp threads. Real product. These are the conversations parents and teachers actually have with their school every week.
            </p>
          </div>

          <div className="space-y-24">
            {WHATSAPP_FLOWS.map((flow, idx) => (
              <article key={flow.slug} className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                {/* Text column — alternates side */}
                <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
                  <span
                    className={`inline-block text-[10px] uppercase tracking-[0.22em] font-bold px-3 py-1.5 rounded-full mb-4 ${
                      flow.role === "parent"
                        ? "bg-brand-100 text-brand-800"
                        : flow.role === "teacher"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {flow.role === "parent" ? "Parent journey" : flow.role === "teacher" ? "Teacher journey" : "Admin journey"} · Flow {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-display text-3xl sm:text-4xl font-bold text-brand-900 leading-tight mb-4">{flow.title}</h3>
                  <p className="text-xl text-emerald-700 font-semibold mb-5">{flow.oneLiner}</p>
                  <p className="text-slate-700 text-base leading-relaxed border-l-4 border-emerald-400 pl-4 italic">
                    {flow.takeaway}
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                      <Zap className="h-3.5 w-3.5" /> Average completion: under a minute
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">
                      <ShieldCheck className="h-3.5 w-3.5" /> Logged in portal · audit trail
                    </span>
                  </div>
                </div>

                {/* Phone column */}
                <div className={idx % 2 === 1 ? "lg:order-1" : ""}>
                  <WhatsAppMockup
                    peerName={flow.peerName}
                    peerMonogram={flow.peerMonogram}
                    peerAvatarColor={flow.peerAvatarColor}
                    messages={flow.messages}
                    showInput={false}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROLE BREAKDOWNS ===== */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-brand-900 to-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold text-gold-300 mb-3">Everything. Everyone.</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Anything they did on a portal — they do in WhatsApp.
            </h2>
            <p className="mt-5 text-slate-300 text-lg">
              Both lists below are live in production. Tap any one to see the conversation flow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {ROLE_LIST.map(group => (
              <div key={group.label} className="rounded-3xl bg-white/5 backdrop-blur border border-white/15 p-7 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{group.icon}</span>
                  <h3 className="font-display text-xl font-bold">{group.label}</h3>
                </div>
                <ul className="space-y-3">
                  {group.items.map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0 mt-0.5" />
                      <span className="text-slate-200">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== THE PORTAL STILL EXISTS ===== */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold text-gold-700 mb-3">Don't worry —</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-900 leading-tight">
                The portal still exists. It's just where admin lives, not where parents do.
              </h2>
              <p className="mt-5 text-slate-700 text-base leading-relaxed">
                Your director, accountant and admin staff get a full web portal for the kind of work that genuinely needs a screen — finance reports, bulk CSV exports, branding, branch management, fee structure setup, user creation. Everyone else gets WhatsApp.
              </p>
              <p className="mt-4 text-slate-700 text-base leading-relaxed">
                Every WhatsApp interaction is logged in the portal. Every score, every incident, every payment, every parent message — searchable, auditable, exportable. The portal sees everything WhatsApp does.
              </p>
              <Link href="/portal/login">
                <Button variant="outline" className="mt-6">
                  Open the admin portal demo <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <p className="text-xs uppercase tracking-wider font-semibold text-emerald-700 mb-4">Who uses what</p>
              <ul className="space-y-4">
                {[
                  { who: "Parents", what: "WhatsApp only", tone: "good" },
                  { who: "Students", what: "WhatsApp + simple portal for results history", tone: "good" },
                  { who: "Teachers", what: "WhatsApp for daily work · portal for term-end grading", tone: "good" },
                  { who: "Form teachers", what: "WhatsApp for register · portal for class teacher comments", tone: "good" },
                  { who: "Accountants", what: "Portal (real desk work)", tone: "mid" },
                  { who: "Director / Admin", what: "Portal (configuration, reports, exports)", tone: "mid" },
                ].map(row => (
                  <li key={row.who} className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200 last:border-0">
                    <span className="font-semibold text-brand-900">{row.who}</span>
                    <span className="text-sm text-slate-600 text-right max-w-[60%]">{row.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTEGRATIONS ===== */}
      <section className="py-16 bg-slate-50 border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold text-gold-700 mb-3">Plumbing</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-900 mb-4">
            Built on WhatsApp Cloud API — Meta's official channel
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Production-grade webhook, interactive buttons + list messages, attachment handling, read receipts. Your school uses its own dedicated Meta business number. We never touch your messages.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            {["WhatsApp Cloud API", "Paystack", "Cloudinary", "Resend Email", "Next.js + Postgres"].map(t => (
              <span key={t} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="py-20 bg-gradient-to-br from-emerald-700 via-emerald-800 to-brand-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-5xl font-bold leading-tight">
            Take 20 minutes. See your school <span className="text-emerald-300">in WhatsApp.</span>
          </h2>
          <p className="mt-5 text-emerald-100 text-lg max-w-2xl mx-auto leading-relaxed">
            We'll set up a sandboxed WhatsApp number, load your school's structure, and walk you through every flow on this page. By the end of the call you'll know if this is for your school.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link href="/for-schools#demo">
              <Button variant="gold" className="text-base px-7 py-3.5">
                Book a 20-minute walkthrough <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/showcase">
              <Button variant="outline" className="text-base px-7 py-3.5 bg-white/5 text-white border-white/30 hover:bg-white/10">
                See sample school websites
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
