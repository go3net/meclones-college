import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Star, ChevronRight, Quote } from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool } from "../data";

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
        className="py-12 border-y"
        style={{
          backgroundColor: school.theme.surface,
          borderColor: `${school.theme.primary}1A`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {school.achievements.map(a => (
            <div key={a.label} className="text-center">
              <p className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{a.value}</p>
              <p className="text-xs uppercase tracking-wider mt-1.5 opacity-70 font-semibold">{a.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CAMPUS LIFE STRIP (real imagery) ---------- */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: school.theme.accent }}>Campus life</p>
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass} leading-tight`} style={{ color: school.theme.primary }}>
                A community you can feel from the gate.
              </h2>
            </div>
            <p className="text-base sm:text-lg opacity-80 leading-relaxed">
              {school.shortName} is more than timetables and exam halls. It is small classes that know your child's name, libraries lit late, prefects who mean it, and an academic culture you can see from the corridors.
            </p>
          </div>

          <div className="grid grid-cols-12 gap-3 sm:gap-4">
            <CampusTile src={school.imagery.campus[0]} className="col-span-12 sm:col-span-6 aspect-[4/3]" />
            <CampusTile src={school.imagery.campus[1]} className="col-span-6 sm:col-span-3 aspect-square" />
            <CampusTile src={school.imagery.campus[2]} className="col-span-6 sm:col-span-3 aspect-square" />
          </div>
        </div>
      </section>

      {/* ---------- PROGRAMS ---------- */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
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
                className="rounded-2xl p-6 sm:p-7 border transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <div
                  className="h-11 w-11 rounded-lg flex items-center justify-center mb-4"
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

      {/* ---------- TESTIMONIAL (with headshot) ---------- */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-3xl overflow-hidden grid md:grid-cols-[280px_1fr]"
            style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
          >
            <div
              className="hidden md:block min-h-[260px]"
              style={{
                backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.15)}, ${hexAlpha(school.theme.primary, 0.55)}), url('${school.imagery.headshot}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="p-8 sm:p-10 flex flex-col justify-center">
              <Quote className="h-10 w-10 mb-5 opacity-50" style={{ color: school.theme.accent }} />
              <p className={`text-lg sm:text-xl leading-snug ${school.theme.headingClass}`}>
                "{school.imagery.testimonial.quote}"
              </p>
              <p className="mt-6 text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: school.theme.accent }}>
                {school.imagery.testimonial.name} <span className="opacity-60 ml-2">·</span> <span className="opacity-80 normal-case font-medium">{school.imagery.testimonial.role}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VALUES STRIP ---------- */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>How we think</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Three commitments
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {school.values.map((v, i) => (
              <div
                key={v.title}
                className="rounded-2xl p-7 text-center"
                style={{
                  backgroundColor: school.theme.bg,
                  border: `1px solid ${school.theme.primary}1A`,
                }}
              >
                <div
                  className="h-14 w-14 mx-auto rounded-full flex items-center justify-center mb-4 shadow-sm"
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
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>From the {school.shortName} office</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {school.newsItems.map((n, idx) => (
              <article
                key={n.title}
                className="rounded-2xl overflow-hidden border group hover:shadow-xl transition-all"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <div
                  className="h-40"
                  style={{
                    backgroundImage: `linear-gradient(180deg, transparent 0%, ${hexAlpha(school.theme.primary, 0.5)} 100%), url('${school.imagery.campus[idx % 3]}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="p-6">
                  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: school.theme.accent }}>
                    <Calendar className="h-3 w-3" /> {n.date}
                  </p>
                  <h3 className={`text-base mb-2 leading-snug ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{n.title}</h3>
                  <p className="text-sm opacity-80 leading-relaxed">{n.teaser}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section
        className="relative py-20 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.94)} 0%, ${hexAlpha(school.theme.primary, 0.78)} 100%), url('${school.imagery.hero}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: school.theme.onPrimary,
        }}
      >
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className={`text-3xl sm:text-5xl mb-4 ${school.theme.headingClass} leading-tight`}>
            Find out if {school.shortName} is right for your family
          </h2>
          <p className="opacity-90 max-w-xl mx-auto mb-8 text-lg">
            Book a campus tour. Tour the grounds, meet the teachers, walk through the curriculum with the head of academics.
          </p>
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all hover:opacity-90 hover:scale-105 shadow-2xl"
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
// Reusable campus tile
// ============================================================

function CampusTile({ src, className }: { src: string; className: string }) {
  return (
    <div
      className={`rounded-2xl bg-slate-200 ${className} shadow-md hover:shadow-xl transition-shadow`}
      style={{ backgroundImage: `url('${src}')`, backgroundSize: "cover", backgroundPosition: "center" }}
    />
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
        backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.86)} 0%, ${hexAlpha(school.theme.primary, 0.62)} 60%, ${hexAlpha("#1E293B", 0.78)} 100%), url('${school.imagery.hero}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: school.theme.onPrimary,
      }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 85% 15%, ${school.theme.accent}55 0%, transparent 50%)`,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36">
        <span
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-semibold mb-7 px-4 py-2 rounded-full backdrop-blur"
          style={{ backgroundColor: `${school.theme.accent}22`, color: school.theme.accent, border: `1px solid ${school.theme.accent}40` }}
        >
          <Star className="h-3 w-3" /> Admissions open · 2026/27
        </span>
        <h1 className={`text-5xl sm:text-6xl lg:text-7xl leading-[1.04] max-w-4xl ${school.theme.headingClass} drop-shadow-lg`}>
          {school.tagline}.
        </h1>
        <p className="mt-7 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">{school.pitch}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm transition-all hover:scale-105 shadow-xl"
            style={{ backgroundColor: school.theme.accent, color: school.theme.onPrimary }}
          >
            Apply now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/showcase/${school.slug}/about`}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm border-2 backdrop-blur transition-all hover:bg-white/10"
            style={{ borderColor: `${school.theme.onPrimary}55`, color: school.theme.onPrimary }}
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
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
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-opacity hover:opacity-90 shadow-md"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              Request prospectus <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/showcase/${school.slug}/about`}
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold border-2"
              style={{ borderColor: school.theme.primary, color: school.theme.primary }}
            >
              Our story
            </Link>
          </div>
        </div>

        {/* Hero image + crest overlay */}
        <div className="relative">
          <div
            className="aspect-[4/5] rounded-3xl shadow-2xl overflow-hidden relative"
            style={{
              backgroundImage: `linear-gradient(180deg, transparent 30%, ${hexAlpha(school.theme.primary, 0.55)} 100%), url('${school.imagery.hero}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 flex items-end p-7">
              <div className="text-white">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
                >
                  <span className={`text-2xl ${school.theme.headingClass}`}>{school.monogram}</span>
                </div>
                <p className={`text-2xl ${school.theme.headingClass}`}>{school.shortName}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-1 opacity-90">
                  Veritas · Caritas · Servitium
                </p>
              </div>
            </div>
          </div>
          <div
            className="absolute -bottom-5 -right-5 px-6 py-4 rounded-2xl shadow-xl"
            style={{ backgroundColor: school.theme.bg, color: school.theme.primary, border: `1px solid ${school.theme.primary}1A` }}
          >
            <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Three decades</p>
            <p className={`text-xl ${school.theme.headingClass}`}>of formation</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MinimalLightHero({ school }: { school: SampleSchool }) {
  return (
    <section style={{ backgroundColor: school.theme.bg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center py-16 sm:py-24">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] font-semibold mb-6" style={{ color: school.theme.accent }}>
            {school.established}
          </p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight mb-8 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
            {school.tagline}
          </h1>
          <div className="h-px w-24 mb-8" style={{ backgroundColor: school.theme.accent }} />
          <p className="text-lg leading-relaxed max-w-xl opacity-80">{school.pitch}</p>
          <div className="mt-12 flex flex-wrap gap-7">
            <Link
              href={`/showcase/${school.slug}/admissions`}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-b-2 pb-1.5 transition-all hover:opacity-70"
              style={{ borderColor: school.theme.primary, color: school.theme.primary }}
            >
              Enquire about admissions <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/showcase/${school.slug}/about`}
              className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider border-b-2 pb-1.5 transition-all hover:opacity-70"
              style={{ borderColor: `${school.theme.text}33`, color: school.theme.text }}
            >
              About the school
            </Link>
          </div>
        </div>

        {/* Premium image tile */}
        <div
          className="aspect-[5/6] rounded-sm shadow-2xl relative overflow-hidden hidden lg:block"
          style={{
            backgroundImage: `url('${school.imagery.hero}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-md"
            style={{ backgroundColor: hexAlpha(school.theme.primary, 0.85), color: school.theme.onPrimary }}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] mb-1 opacity-70">Cambridge Pathway</p>
            <p className={`text-base ${school.theme.headingClass}`}>Year 7 – Year 13</p>
          </div>
        </div>
      </div>
    </section>
  );
}
