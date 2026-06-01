import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Quote, Users, GraduationCap, Heart, Building2,
  ShieldCheck, Sparkles,
} from "lucide-react";
import { getSampleSchool, hexAlpha } from "../../data";

export default function SampleSchoolAbout({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ color: school.theme.onPrimary }}>
        <Image src={school.imagery.about} alt={`${school.shortName} campus`} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.94)} 0%, ${hexAlpha(school.theme.primary, 0.7)} 100%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-4" style={{ color: school.theme.accent }}>
            About {school.shortName}
          </p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl ${school.theme.headingClass} max-w-3xl leading-tight drop-shadow-lg`}>
            A school built around character, scholarship, and a sense of place.
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">{school.pitch}</p>
        </div>
      </section>

      {/* ===== FOUNDER NARRATIVE ===== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
            <div className="lg:sticky lg:top-28">
              <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Our story</p>
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass} leading-tight`} style={{ color: school.theme.primary }}>
                {school.established}. A clear conviction.
              </h2>
            </div>
            <div className="space-y-5 text-base sm:text-lg leading-relaxed opacity-85">
              <p>
                {school.shortName} began with a question that has not changed in {Math.max(1, new Date().getFullYear() - parseInt(school.established.replace(/\D/g, "") || "1995"))} years: <em>what does a good secondary education look like for a Nigerian child today</em>? The founders — teachers, parents, and one stubborn headmaster — gave themselves a single answer to defend: scholarship paired with character, taught in small enough rooms that every child is known by name.
              </p>
              <p>
                The campus has grown. The science labs have caught up with the syllabus. The library has tripled. But the conviction sits where it always has — in the corridors between classes, in the prep hall after dinner, in the way every teacher knows every student's parents by their first name.
              </p>
              <p>
                We are not the largest school in {school.state}. We do not try to be. We are, however, deliberate. About who we admit. About what we teach. About the kind of people we want our graduates to become.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Image collage strip ===== */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {school.imagery.lifeGallery.slice(0, 4).map((g, i) => (
            <div key={i} className="aspect-square rounded-2xl relative overflow-hidden shadow-md hover:shadow-xl transition-shadow group">
              <Image src={g.src} alt={g.label} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          ))}
        </div>
      </section>

      {/* ===== THE FOUR PILLARS ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>What we stand for</p>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              The four pillars
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: GraduationCap, title: "Scholarship", body: "Read widely. Write often. Argue your case. Memorisation is a tool, not a goal." },
              { icon: Heart, title: "Character", body: "Conduct is graded. We say so plainly. A first-class mind without character is half an education." },
              { icon: Users, title: "Community", body: "Houses, prefects, mentors. No student walks through {short} alone." },
              { icon: Building2, title: "Place", body: "We are of Nigeria, in Nigeria, for Nigeria. Our graduates leave equipped to lead here." },
            ].map(p => (
              <div
                key={p.title}
                className="rounded-2xl p-6 sm:p-7 border bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
                >
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className={`text-lg ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{p.title}</h3>
                <p className="mt-2 text-sm opacity-75 leading-relaxed">{p.body.replace("{short}", school.shortName)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LEADERSHIP TEAM ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Leadership team</p>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              The people who run the place
            </h2>
            <p className="mt-4 opacity-80 leading-relaxed">
              Every member of our senior team brings classroom experience and academic credentials you can verify.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {school.faculty.map(f => (
              <article
                key={f.name}
                className="rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-xl transition-all"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="relative aspect-square">
                  <Image src={f.photo} alt={f.name} fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                  <div className="absolute inset-x-0 bottom-0 p-4" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.85), transparent)" }}>
                    <p className="text-xs uppercase tracking-[0.18em] font-bold text-white">{f.role}</p>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className={`text-base ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{f.name}</h3>
                  <p className="mt-2 text-xs opacity-70 leading-relaxed">{f.credentials}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VALUES quotes ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>In our own words</p>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Three commitments we hold ourselves to
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {school.values.map((v, i) => (
              <div
                key={v.title}
                className="rounded-2xl p-7 shadow-sm"
                style={{ backgroundColor: school.theme.bg, borderLeft: `4px solid ${school.theme.accent}` }}
              >
                <p className={`text-3xl ${school.theme.headingClass} mb-3`} style={{ color: school.theme.accent }}>
                  {String(i + 1).padStart(2, "0")}.
                </p>
                <h3 className={`text-lg ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{v.title}</h3>
                <p className="mt-2 text-sm opacity-75 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOUNDER QUOTE band ===== */}
      <section
        className="relative py-20 sm:py-28 overflow-hidden"
        style={{ color: school.theme.onPrimary }}
      >
        <Image src={school.imagery.contact} alt={`${school.shortName} campus`} fill sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.95)} 0%, ${hexAlpha(school.theme.primary, 0.85)} 100%)` }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="h-12 w-12 mx-auto mb-6 opacity-50" style={{ color: school.theme.accent }} />
          <p className={`text-2xl sm:text-3xl lg:text-4xl leading-snug ${school.theme.headingClass}`}>
            "What we want from a {school.shortName} graduate is simple: that they can do hard things, treat people well, and live a life they can defend."
          </p>
          <p className="mt-8 text-sm uppercase tracking-[0.22em] font-semibold" style={{ color: school.theme.accent }}>
            — Founding Head, {school.shortName}
          </p>
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className={`text-2xl sm:text-3xl mb-4 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
            Come and see us
          </h3>
          <p className="opacity-80 max-w-xl mx-auto mb-7 leading-relaxed">
            The best way to understand {school.shortName} is to walk the corridors. Termly open days; private tours by appointment.
          </p>
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 shadow-lg"
            style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
          >
            Book a visit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
