import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, BookOpen, Calendar, Star, ChevronRight, Quote,
  GraduationCap, ShieldCheck, Brain, Users, MessageCircle, Globe2,
  Heart, Trophy, CheckCircle2, Sparkles, Award, Mail, Phone, MapPin,
} from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool, type WhyUsReason } from "../data";

export default function SampleSchoolHome({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* ===== HERO (one of three variants) ===== */}
      {school.heroStyle === "fullbleed-dark" && <FullbleedDarkHero school={school} />}
      {school.heroStyle === "split-warm" && <SplitWarmHero school={school} />}
      {school.heroStyle === "minimal-light" && <MinimalLightHero school={school} />}

      {/* ===== ABOUT collage (text + 4-tile photo/stat grid) ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>
                About {school.shortName}
              </p>
              <h2 className={`text-3xl sm:text-4xl lg:text-5xl leading-tight ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                A school where every child is known, nurtured, and stretched.
              </h2>
              <p className="mt-6 text-base sm:text-lg opacity-85 leading-relaxed">{school.pitch}</p>
              <ul className="mt-7 space-y-3">
                {[
                  `${school.examPrep.slice(0, 4).join(" · ")} exam preparation streams`,
                  school.programs[0].body.split(".")[0] + ".",
                  school.programs[1].body.split(".")[0] + ".",
                  `${school.achievements[1].value} student–teacher ratio`,
                  `Real-time parent portal — fees, results, attendance in one place.`,
                ].map(item => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: school.theme.accent }} />
                    <span className="opacity-85">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/showcase/${school.slug}/about`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
                >
                  Learn more <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/showcase/${school.slug}/admissions`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2"
                  style={{ borderColor: school.theme.primary, color: school.theme.primary }}
                >
                  Schedule a tour
                </Link>
              </div>
            </div>

            {/* 4-tile collage */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden shadow-lg">
                    <Image src={school.imagery.aboutHistory} alt={`${school.shortName} library`} fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                  </div>
                  <div
                    className="h-32 sm:h-36 rounded-2xl flex items-center justify-center p-6"
                    style={{ backgroundColor: `${school.theme.accent}1F` }}
                  >
                    <div className="text-center">
                      <Trophy className="h-8 w-8 mx-auto mb-1.5" style={{ color: school.theme.accent }} />
                      <p className={`text-sm font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                        {school.achievements[0].value} {school.achievements[0].label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div
                    className="h-32 sm:h-36 rounded-2xl flex items-center justify-center p-6"
                    style={{ backgroundColor: `${school.theme.primary}10` }}
                  >
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-1.5" style={{ color: school.theme.primary }} />
                      <p className={`text-sm font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                        {school.achievements[2].value} {school.achievements[2].label.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden shadow-lg">
                    <Image src={school.imagery.aboutValues} alt={`${school.shortName} students`} fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ACADEMIC PROGRAMS (4 image cards) ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            school={school}
            eyebrow="Academy"
            title="Built on rigour. Designed for the world."
            lead="From Junior Secondary through Senior Secondary and beyond, our programs are mapped to the curriculum and complemented by top-tier exam preparation."
            center
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BookOpen, ...school.programs[0], img: school.imagery.programs.jss, tag: school.heroStyle === "minimal-light" ? "Years 7–9" : "JSS 1–3" },
              { icon: GraduationCap, ...school.programs[1], img: school.imagery.programs.sss, tag: school.heroStyle === "minimal-light" ? "Years 10–13" : "SS 1–3" },
              { icon: Trophy, ...school.programs[2], img: school.imagery.programs.examPrep, tag: school.examPrep.slice(0, 2).join(" · ") },
              { icon: Award, ...school.programs[3], img: school.imagery.programs.admissions, tag: "Now Open" },
            ].map(p => (
              <article
                key={p.title}
                className="rounded-2xl overflow-hidden border bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="relative aspect-[4/3]">
                  <Image src={p.img} alt={p.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, ${hexAlpha(school.theme.primary, 0.4)} 100%)` }} />
                  <div
                    className="absolute top-3 left-3 h-10 w-10 rounded-lg flex items-center justify-center shadow-md backdrop-blur"
                    style={{ backgroundColor: "rgba(255,255,255,0.95)", color: school.theme.primary }}
                  >
                    <p.icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="p-5">
                  <span
                    className="inline-block text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full mb-3"
                    style={{ backgroundColor: `${school.theme.accent}22`, color: school.theme.primary }}
                  >
                    {p.tag}
                  </span>
                  <h3 className={`text-lg ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{p.title}</h3>
                  <p className="mt-2 text-sm opacity-75 leading-relaxed line-clamp-3">{p.body}</p>
                  <Link
                    href={`/showcase/${school.slug}/about`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all"
                    style={{ color: school.theme.primary }}
                  >
                    Learn more <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS + EXAMS dark band ===== */}
      <section style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 grid lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-wrap items-center gap-8 lg:gap-12">
            <StatPill icon={Users} value={school.achievements[0].value} label={school.achievements[0].label} school={school} />
            <StatPill icon={GraduationCap} value={school.achievements[1].value} label={school.achievements[1].label} school={school} />
            <StatPill icon={ShieldCheck} value={school.achievements[2].value} label={school.achievements[2].label} school={school} />
          </div>
          <div>
            <p className={`font-semibold mb-3 ${school.theme.headingClass}`}>Exams we prepare for</p>
            <div className="flex flex-wrap gap-2">
              {school.examPrep.map(e => (
                <span
                  key={e}
                  className="px-3 py-1.5 rounded-md border text-xs font-semibold tracking-wide"
                  style={{ borderColor: school.theme.accent, color: school.theme.accent }}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY US (6 reasons) ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            school={school}
            eyebrow={`Why ${school.shortName}`}
            title="Six reasons parents choose us."
            center
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {school.whyUs.map(f => (
              <div
                key={f.title}
                className="rounded-2xl p-7 border transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
                style={{ backgroundColor: school.theme.bg, borderColor: `${school.theme.primary}1A` }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${school.theme.primary}10`, color: school.theme.primary }}
                >
                  <WhyIcon name={f.icon} />
                </div>
                <h3 className={`text-lg ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{f.title}</h3>
                <p className="mt-2 text-sm opacity-75 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ADMISSION PROCESS (dark gradient with photo bg) ===== */}
      <section
        className="relative py-20 sm:py-24 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.96)} 0%, ${hexAlpha(school.theme.primary, 0.85)} 100%), url('${school.imagery.admissions}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: school.theme.onPrimary,
        }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Admissions</p>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl leading-tight ${school.theme.headingClass}`}>
              Four simple steps to join {school.shortName}
            </h2>
            <p className="mt-4 opacity-85 text-lg">Most families complete their application in under 15 minutes.</p>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {school.admissionsSteps.map(s => (
              <div key={s.step} className="relative">
                <div className={`text-6xl font-bold mb-2 ${school.theme.headingClass}`} style={{ color: `${school.theme.accent}66` }}>
                  {s.step}
                </div>
                <h3 className={`text-lg ${school.theme.headingClass}`}>{s.title}</h3>
                <p className="mt-2 text-sm opacity-80 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href={`/showcase/${school.slug}/admissions`}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold transition-all hover:scale-105 shadow-xl"
              style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
            >
              Start your application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FACULTY showcase (4 cards) ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            school={school}
            eyebrow="Leadership & faculty"
            title="The people who run the place."
            lead={`Every member of our senior team brings deep classroom experience and academic credentials you can verify. These are the people your child will know by name within a week.`}
            center
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {school.faculty.map(f => (
              <article
                key={f.name}
                className="rounded-2xl overflow-hidden border bg-white text-center hover:shadow-xl transition-all"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="relative aspect-square">
                  <Image src={f.photo} alt={f.name} fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                </div>
                <div className="p-5">
                  <h3 className={`text-base ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{f.name}</h3>
                  <p className="text-xs uppercase tracking-wider font-semibold mt-1" style={{ color: school.theme.accent }}>
                    {f.role}
                  </p>
                  <p className="mt-3 text-xs opacity-70 leading-relaxed">{f.credentials}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS (3 with avatars) ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            school={school}
            eyebrow="What our community says"
            title={`Trusted by ${school.city} families.`}
            center
          />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {school.testimonials.map(t => (
              <article
                key={t.name}
                className="rounded-2xl p-7 border bg-white shadow-sm hover:shadow-lg transition-shadow"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative h-14 w-14 rounded-full overflow-hidden ring-4 shrink-0" style={{ /* ring colour via inline */ }}>
                    <Image src={t.avatar} alt={t.name} fill sizes="56px" className="object-cover" />
                  </div>
                  <div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.stars }).map((_, i) => (
                        <Star key={i} className="h-4 w-4" style={{ fill: school.theme.accent, color: school.theme.accent }} />
                      ))}
                    </div>
                    <p className="text-[11px] mt-1 opacity-60">Verified</p>
                  </div>
                </div>
                <p className="text-sm opacity-85 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 pt-4 border-t" style={{ borderColor: `${school.theme.primary}1A` }}>
                  <p className={`font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{t.name}</p>
                  <p className="text-xs opacity-70 mt-0.5">{t.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIFE AT (Instagram-style gallery) ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Campus life</p>
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                Life at {school.shortName}
              </h2>
            </div>
            <a
              href={`https://instagram.com/${school.slug.replace(/-/g, "")}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: school.theme.primary }}
            >
              Follow @{school.slug.replace(/-/g, "")} <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {school.imagery.lifeGallery.map(g => (
              <div key={g.label} className="aspect-[4/3] rounded-2xl relative overflow-hidden group cursor-pointer shadow-md hover:shadow-xl transition-all">
                <Image src={g.src} alt={g.label} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-semibold">{g.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GET IN TOUCH split (photo card + form) ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-2 rounded-3xl p-8 flex flex-col justify-between min-h-[320px] relative overflow-hidden text-white shadow-xl">
              <Image
                src={school.imagery.contact}
                alt={`${school.shortName} campus`}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover -z-10"
              />
              <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.95)} 0%, ${hexAlpha(school.theme.primary, 0.78)} 100%)` }} />
              <div className="relative">
                <span
                  className="inline-block text-[10px] uppercase tracking-[0.18em] font-bold px-3 py-1 rounded-full mb-4"
                  style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
                >
                  Get in touch
                </span>
                <h3 className={`text-2xl sm:text-3xl leading-tight ${school.theme.headingClass}`}>
                  Have questions or want to learn more? We'd love to hear from you.
                </h3>
              </div>
              <div className="relative mt-8 space-y-2 text-sm opacity-90">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: school.theme.accent }} /> {school.contact.addressLines.join(", ")}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: school.theme.accent }} /> {school.contact.phone}</p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4" style={{ color: school.theme.accent }} /> {school.contact.email}</p>
              </div>
            </div>
            <form
              action="/for-schools#demo"
              className="lg:col-span-3 rounded-3xl border p-6 md:p-8 shadow-sm grid sm:grid-cols-2 gap-4"
              style={{ backgroundColor: school.theme.bg, borderColor: `${school.theme.primary}1A` }}
            >
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold opacity-70 uppercase tracking-wide">Full name</label>
                <input className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg }} />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-70 uppercase tracking-wide">Email</label>
                <input type="email" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg }} />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-70 uppercase tracking-wide">Phone</label>
                <input type="tel" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg }} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold opacity-70 uppercase tracking-wide">I am a…</label>
                <select className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg }}>
                  <option>Prospective parent</option>
                  <option>Prospective student</option>
                  <option>Current parent</option>
                  <option>Alumni</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold opacity-70 uppercase tracking-wide">Your message</label>
                <textarea rows={4} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg }} />
              </div>
              <p className="sm:col-span-2 text-xs opacity-60 italic">Sample form — submissions route back to the {school.shortName} sample pitch.</p>
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 inline-flex items-center gap-2 shadow-md"
                  style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
                >
                  Send message <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ===== NEWS / EVENTS (3 image cards) ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>News & Events</p>
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                What's happening at {school.shortName}
              </h2>
            </div>
            <Link
              href={`/showcase/${school.slug}/about`}
              className="hidden md:inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: school.theme.primary }}
            >
              All news <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {school.news.map(n => (
              <article
                key={n.title}
                className="rounded-2xl overflow-hidden border bg-white hover:shadow-xl transition-shadow group"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="relative h-48">
                  <Image src={n.img} alt={n.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="inline-block text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${school.theme.accent}22`, color: school.theme.primary }}
                    >
                      {n.tag}
                    </span>
                    <span className="text-xs opacity-60">{n.date}</span>
                  </div>
                  <h3 className={`text-base leading-snug ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{n.title}</h3>
                  <p className="mt-2 text-sm opacity-75 leading-relaxed">{n.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA (accent band) ===== */}
      <section style={{ backgroundColor: school.theme.accent }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className={`text-2xl md:text-3xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Ready to give your child a {school.shortName} education?
            </h2>
            <p className="mt-2 opacity-90" style={{ color: school.theme.primary }}>
              Applications take less than 15 minutes. We'll guide you the rest of the way.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link
              href={`/showcase/${school.slug}/admissions`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-md"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              Apply now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/showcase/${school.slug}/contact`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold border-2"
              style={{ borderColor: school.theme.primary, color: school.theme.primary, backgroundColor: school.theme.bg }}
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// ============================================================
// Shared helpers
// ============================================================

function SectionHeading({
  school, eyebrow, title, lead, center,
}: {
  school: SampleSchool;
  eyebrow: string;
  title: string;
  lead?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center max-w-2xl mx-auto" : "max-w-2xl"}>
      <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>{eyebrow}</p>
      <h2 className={`text-3xl sm:text-4xl lg:text-5xl leading-tight ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
        {title}
      </h2>
      {lead && <p className="mt-4 opacity-80 leading-relaxed">{lead}</p>}
    </div>
  );
}

function StatPill({
  icon: Icon, value, label, school,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  school: SampleSchool;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${school.theme.accent}22` }}
      >
        <Icon className="h-6 w-6" style={{ color: school.theme.accent }} />
      </div>
      <div>
        <p className={`text-3xl font-bold leading-none ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{value}</p>
        <p className="text-xs mt-1 opacity-80">{label}</p>
      </div>
    </div>
  );
}

function WhyIcon({ name }: { name: WhyUsReason["icon"] }) {
  const map = {
    graduation: GraduationCap,
    shield: ShieldCheck,
    brain: Brain,
    users: Users,
    book: BookOpen,
    message: MessageCircle,
    globe: Globe2,
    heart: Heart,
  } as const;
  const Cmp = map[name] ?? Sparkles;
  return <Cmp className="h-5 w-5" />;
}

// ============================================================
// Hero variants — each radically different on purpose
// ============================================================

function FullbleedDarkHero({ school }: { school: SampleSchool }) {
  return (
    <section className="relative overflow-hidden" style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}>
      <Image
        src={school.imagery.hero}
        alt={`${school.shortName} campus`}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(110deg, ${hexAlpha(school.theme.primary, 0.94)} 0%, ${hexAlpha(school.theme.primary, 0.85)} 45%, ${hexAlpha(school.theme.primary, 0.4)} 100%)` }}
      />
      <div className="absolute inset-0 lg:hidden" style={{ backgroundColor: hexAlpha(school.theme.primary, 0.72) }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur ring-1 mb-6"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: school.theme.accent, borderColor: "rgba(255,255,255,0.15)" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Admissions open for 2026/2027 session
            </div>
            <h1 className={`text-4xl md:text-5xl lg:text-7xl ${school.theme.headingClass} leading-[1.04] drop-shadow-lg`}>
              {school.tagline.split(" ").slice(0, -1).join(" ")}{" "}
              <span style={{ color: school.theme.accent }}>{school.tagline.split(" ").slice(-1)[0]}</span>.
            </h1>
            <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-xl leading-relaxed">{school.pitch}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/showcase/${school.slug}/admissions`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-base font-bold transition-all hover:scale-105 shadow-xl"
                style={{ backgroundColor: school.theme.accent, color: school.theme.onPrimary }}
              >
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/showcase/${school.slug}/about`}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold border backdrop-blur transition-all hover:bg-white/10"
                style={{ borderColor: "rgba(255,255,255,0.3)", color: school.theme.onPrimary, backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                Explore programs <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {school.achievements.slice(0, 3).map(a => (
                <div key={a.label}>
                  <p className={`text-3xl font-bold ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{a.value}</p>
                  <p className="text-xs mt-1 opacity-80">{a.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block" aria-hidden />
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
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {school.achievements.slice(0, 3).map(a => (
              <div key={a.label}>
                <p className={`text-3xl font-bold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{a.value}</p>
                <p className="text-xs mt-1 opacity-75">{a.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo + crest tile */}
        <div className="relative">
          <div className="aspect-[4/5] rounded-3xl shadow-2xl overflow-hidden relative">
            <Image src={school.imagery.hero} alt={school.shortName} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 30%, ${hexAlpha(school.theme.primary, 0.6)} 100%)` }} />
            <div className="absolute inset-0 flex items-end p-8">
              <div className="text-white">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center mb-3 shadow-xl"
                  style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
                >
                  <span className={`text-2xl ${school.theme.headingClass}`}>{school.monogram}</span>
                </div>
                <p className={`text-2xl ${school.theme.headingClass}`}>{school.shortName}</p>
                <p className="text-[10px] uppercase tracking-[0.2em] mt-1 opacity-90">Veritas · Caritas · Servitium</p>
              </div>
            </div>
          </div>
          <div
            className="absolute -bottom-5 -right-5 px-6 py-4 rounded-2xl shadow-2xl"
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
          <h1 className={`text-4xl sm:text-5xl lg:text-7xl leading-[1.04] tracking-tight mb-8 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
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
          <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
            {school.achievements.slice(0, 3).map(a => (
              <div key={a.label}>
                <p className={`text-3xl font-bold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{a.value}</p>
                <p className="text-xs mt-1 opacity-70 uppercase tracking-wider">{a.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Premium image tile */}
        <div className="aspect-[5/6] rounded-sm shadow-2xl relative overflow-hidden hidden lg:block">
          <Image src={school.imagery.hero} alt={school.shortName} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-md" style={{ backgroundColor: hexAlpha(school.theme.primary, 0.88), color: school.theme.onPrimary }}>
            <p className="text-[10px] uppercase tracking-[0.3em] mb-1 opacity-70">Cambridge Pathway</p>
            <p className={`text-base ${school.theme.headingClass}`}>Year 7 – Year 13</p>
          </div>
        </div>
      </div>
    </section>
  );
}
