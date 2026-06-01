import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Quote, Users, GraduationCap, Heart, Building2 } from "lucide-react";
import { getSampleSchool } from "../../data";

export default function SampleSchoolAbout({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* Page header */}
      <section
        className="py-14 sm:py-20 border-b"
        style={{
          backgroundColor: school.theme.surface,
          borderColor: `${school.theme.primary}1A`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>
            About {school.shortName}
          </p>
          <h1 className={`text-4xl sm:text-5xl ${school.theme.headingClass} max-w-3xl`} style={{ color: school.theme.primary }}>
            A school built around character, scholarship, and a sense of place.
          </h1>
          <p className="mt-5 text-lg opacity-80 max-w-2xl leading-relaxed">{school.pitch}</p>
        </div>
      </section>

      {/* Founder narrative */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose-readable">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Our story</p>
          <h2 className={`text-3xl ${school.theme.headingClass} mb-6`} style={{ color: school.theme.primary }}>
            {school.established}. A few rooms, a handful of teachers, a clear conviction.
          </h2>
          <div className="space-y-4 text-base leading-relaxed opacity-85">
            <p>
              {school.shortName} began with a question that has not changed in {new Date().getFullYear() - parseInt(school.established.replace(/\D/g, "")) || 30} years: <em>what does a good secondary education look like for a Nigerian child today</em>? The founders — teachers, parents, and one stubborn headmaster — gave themselves a single answer to defend: scholarship paired with character, taught in small enough rooms that every child is known by name.
            </p>
            <p>
              The campus has grown. The science labs have caught up with the syllabus. The library has tripled. But the conviction sits where it always has — in the corridors between classes, in the prep hall after dinner, in the way every teacher knows every student's parents by their first name.
            </p>
            <p>
              We are not the largest school in {school.state}. We do not try to be. We are, however, deliberate. About who we admit. About what we teach. About the kind of people we want our graduates to become.
            </p>
          </div>
        </div>
      </section>

      {/* The four pillars */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>What we stand for</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
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
                className="rounded-xl p-6 border"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <div
                  className="h-11 w-11 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
                >
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className={`text-lg mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{p.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{p.body.replace("{short}", school.shortName)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values from data file */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>In our own words</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Three commitments we hold ourselves to
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {school.values.map((v, i) => (
              <div
                key={v.title}
                className="rounded-xl p-6"
                style={{
                  backgroundColor: school.theme.surface,
                  borderLeft: `4px solid ${school.theme.accent}`,
                }}
              >
                <p className={`text-2xl ${school.theme.headingClass} mb-2`} style={{ color: school.theme.accent }}>
                  {String(i + 1).padStart(2, "0")}.
                </p>
                <h3 className={`text-lg mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{v.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section
        className="py-16 sm:py-20 border-y"
        style={{
          backgroundColor: school.theme.primary,
          color: school.theme.onPrimary,
          borderColor: `${school.theme.accent}33`,
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="h-10 w-10 mx-auto mb-6 opacity-50" style={{ color: school.theme.accent }} />
          <p className={`text-2xl sm:text-3xl leading-snug ${school.theme.headingClass}`}>
            "What we want from a {school.shortName} graduate is simple: that they can do hard things, treat people well, and live a life they can defend."
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.18em]" style={{ color: school.theme.accent }}>
            — Founding Head, {school.shortName}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className={`text-2xl sm:text-3xl mb-4 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
            Come and see us
          </h3>
          <p className="opacity-80 max-w-xl mx-auto mb-6">
            The best way to understand {school.shortName} is to walk the corridors. Termly open days; private tours by appointment.
          </p>
          <Link
            href={`/showcase/${school.slug}/admissions`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
          >
            Book a visit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
