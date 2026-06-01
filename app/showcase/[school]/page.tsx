import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Star, ChevronRight } from "lucide-react";
import { getSampleSchool, type SampleSchool } from "../data";

export default function SampleSchoolHome({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* ---------- HERO (one of three styles) ---------- */}
      {school.heroStyle === "fullbleed-dark" && <FullbleedDarkHero school={school} />}
      {school.heroStyle === "split-warm" && <SplitWarmHero school={school} />}
      {school.heroStyle === "minimal-light" && <MinimalLightHero school={school} />}

      {/* ---------- STATS STRIP ---------- */}
      <section
        className="py-10 border-y"
        style={{
          backgroundColor: school.theme.surface,
          borderColor: `${school.theme.primary}1A`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {school.achievements.map(a => (
            <div key={a.label} className="text-center">
              <p className={`text-3xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{a.value}</p>
              <p className="text-xs uppercase tracking-wider mt-1 opacity-70">{a.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PROGRAMS ---------- */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>What we teach</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              A curriculum built for ambition
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {school.programs.map(p => (
              <div
                key={p.title}
                className="rounded-xl p-6 border transition-all hover:shadow-lg"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${school.theme.accent}22`, color: school.theme.primary }}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className={`text-lg mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{p.title}</h3>
                <p className="text-sm leading-relaxed opacity-80">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- VALUES STRIP ---------- */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>How we think</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Three commitments
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {school.values.map((v, i) => (
              <div key={v.title} className="text-center">
                <div
                  className="h-14 w-14 mx-auto rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
                >
                  <span className={`text-lg ${school.theme.headingClass}`}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className={`text-lg mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{v.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- NEWS ---------- */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Latest</p>
              <h2 className={`text-3xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>From the {school.shortName} office</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {school.newsItems.map(n => (
              <article
                key={n.title}
                className="rounded-xl p-6 border"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: school.theme.accent }}>
                  <Calendar className="h-3 w-3 inline mr-1" /> {n.date}
                </p>
                <h3 className={`text-base mb-2 leading-snug ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{n.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{n.teaser}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section
        className="py-16"
        style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-3xl sm:text-4xl mb-4 ${school.theme.headingClass}`}>
            Find out if {school.shortName} is right for your family
          </h2>
          <p className="opacity-80 max-w-xl mx-auto mb-7">
            Book a campus tour. Tour the grounds, meet the teachers, walk through the curriculum with the head of academics.
          </p>
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
          >
            Start an enquiry <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

// ============================================================
// Hero variants — each radically different on purpose
// ============================================================

function FullbleedDarkHero({ school }: { school: SampleSchool }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${school.theme.primary} 0%, #1E293B 60%, ${school.theme.primary} 100%)`,
        color: school.theme.onPrimary,
      }}
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 80% 20%, ${school.theme.accent} 0%, transparent 40%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <span
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold mb-6 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: `${school.theme.accent}22`, color: school.theme.accent }}
        >
          <Star className="h-3 w-3" /> Admissions open · 2026/27
        </span>
        <h1 className={`text-5xl sm:text-6xl lg:text-7xl leading-[1.05] max-w-4xl ${school.theme.headingClass}`}>
          {school.tagline}.
        </h1>
        <p className="mt-6 text-lg opacity-80 max-w-2xl leading-relaxed">{school.pitch}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: school.theme.accent, color: school.theme.onPrimary }}
          >
            Apply now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/showcase/${school.slug}/about`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border transition-colors hover:bg-white/5"
            style={{ borderColor: `${school.theme.onPrimary}33`, color: school.theme.onPrimary }}
          >
            Why {school.shortName} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SplitWarmHero({ school }: { school: SampleSchool }) {
  return (
    <section style={{ backgroundColor: school.theme.bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-4" style={{ color: school.theme.accent }}>
            {school.established} · {school.city}, {school.state}
          </p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl leading-tight ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
            {school.tagline}.
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed opacity-85">{school.pitch}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/showcase/${school.slug}/admissions`}
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              Request prospectus <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/showcase/${school.slug}/about`}
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold border"
              style={{ borderColor: school.theme.primary, color: school.theme.primary }}
            >
              Our story
            </Link>
          </div>
        </div>

        {/* Decorative crest panel */}
        <div className="relative">
          <div
            className="aspect-square rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${school.theme.primary} 0%, #14532D 100%)`,
            }}
          >
            <div className="text-center">
              <div
                className="h-32 w-32 mx-auto rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
              >
                <span className={`text-7xl ${school.theme.headingClass}`}>{school.monogram}</span>
              </div>
              <p className={`text-xl ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{school.shortName}</p>
              <p className="text-xs uppercase tracking-[0.2em] mt-2" style={{ color: school.theme.bg }}>
                Veritas · Caritas · Servitium
              </p>
            </div>
          </div>
          <div
            className="absolute -bottom-4 -right-4 px-5 py-3 rounded-xl shadow-lg"
            style={{ backgroundColor: school.theme.bg, color: school.theme.primary }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Three decades</p>
            <p className={`text-lg ${school.theme.headingClass}`}>of formation</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MinimalLightHero({ school }: { school: SampleSchool }) {
  return (
    <section style={{ backgroundColor: school.theme.bg }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <p className="text-xs uppercase tracking-[0.28em] font-semibold mb-6" style={{ color: school.theme.accent }}>
          {school.established}
        </p>
        <h1 className={`text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight mb-8 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
          {school.tagline}
        </h1>
        <div className="h-px w-24 mb-8" style={{ backgroundColor: school.theme.accent }} />
        <p className="text-lg leading-relaxed max-w-2xl opacity-80">{school.pitch}</p>
        <div className="mt-12 flex flex-wrap gap-6">
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-b-2 pb-1 transition-opacity hover:opacity-70"
            style={{ borderColor: school.theme.primary, color: school.theme.primary }}
          >
            Enquire about admissions <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/showcase/${school.slug}/about`}
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-b-2 pb-1 transition-opacity hover:opacity-70"
            style={{ borderColor: `${school.theme.text}33`, color: school.theme.text }}
          >
            About the school
          </Link>
        </div>
      </div>
    </section>
  );
}
