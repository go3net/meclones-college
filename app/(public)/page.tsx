import Link from "next/link";
import Image from "next/image";
import { Button, Card, CardBody, SectionHeading, Badge } from "@/components/ui";
import { SCHOOL, STATS, EXAMS } from "@/lib/constants";
import { PLACE } from "@/lib/images";
import { FadeUp, HeroEnter } from "@/components/Animate";
import {
  GraduationCap, BookOpen, Trophy, Users, ShieldCheck, Brain, Sparkles,
  CalendarCheck, MessageCircle, ArrowRight, CheckCircle2, Star, ChevronRight,
  Award, Globe2, Heart,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-brand-900">
        {/* Background image with navy overlay for legibility */}
        <div className="absolute inset-0">
          <Image
            src={PLACE.homeHero}
            alt="Meclones College students on campus"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-900/85 to-brand-900/40" />
          <div className="absolute inset-0 lg:hidden bg-brand-900/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <HeroEnter>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-gold-200 ring-1 ring-white/15 mb-6">
                <Sparkles className="h-3.5 w-3.5" /> Admissions open for 2026/2027 session
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                Raising Confident,<br className="hidden md:block" /> Responsible <span className="text-gold-300">Students</span>.
              </h1>
              <p className="mt-6 text-lg text-slate-200 max-w-xl leading-relaxed">
                At {SCHOOL.name}, we nurture values, ignite potential and prepare students for lifelong success across <span className="text-gold-200 font-medium">JSS 1–3</span>, <span className="text-gold-200 font-medium">SS 1–3</span> and top-tier exam preparation.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/apply"><Button variant="gold" className="px-5 py-3 text-base">Apply Now <ArrowRight className="h-4 w-4" /></Button></Link>
                <Link href="/academics"><Button variant="outline" className="px-5 py-3 text-base bg-white/5 text-white border-white/30 hover:bg-white/10">Explore Programs <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
                {[
                  [`${STATS.alumni}`, "Alumni"],
                  [`${STATS.teachers}`, "Teachers"],
                  [`${STATS.yearsExperience}`, "Years Experience"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-3xl font-bold text-gold-300">{v}</p>
                    <p className="text-xs text-slate-300 mt-1">{l}</p>
                  </div>
                ))}
              </div>
            </HeroEnter>
            {/* The right column is intentionally empty on desktop so the hero
                photo behind shows through. On mobile the photo is the
                background of the whole hero section. */}
            <div className="hidden lg:block" aria-hidden />
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionHeading eyebrow="About Meclones" title="A school where every child is known, nurtured, and stretched." />
              <p className="mt-6 text-slate-600 leading-relaxed">
                Founded on the principles of academic excellence and Christian moral grounding, Meclones College Lekki has been a quiet force in Lagos secondary education for over fifteen years. We blend a globally informed curriculum with the warmth of a tight-knit Nigerian community.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Cambridge-aligned curriculum with strong WAEC, IGCSE & SAT outcomes",
                  "Small class sizes — average 22 students per class",
                  "Dedicated WAEC, IGCSE, and SAT preparation tracks",
                  "Boarding and day school options",
                  "Smart parent portal — fees, attendance, results in one place",
                ].map(item => (
                  <li key={item} className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /><span className="text-slate-700">{item}</span></li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link href="/about"><Button>Learn More</Button></Link>
                <Link href="/book-visit"><Button variant="outline">Schedule a Tour</Button></Link>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="relative h-48 rounded-xl overflow-hidden">
                    <Image src={PLACE.aboutHistory} alt="Students reading in the library" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                  </div>
                  <div className="h-32 rounded-xl bg-gold-100 flex items-center justify-center p-6">
                    <div className="text-center"><Trophy className="h-8 w-8 mx-auto mb-1 text-gold-700" /><p className="text-sm font-semibold text-gold-900">{STATS.alumni}+ alumni</p></div>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="h-32 rounded-xl bg-emerald-100 flex items-center justify-center p-6">
                    <div className="text-center"><Users className="h-8 w-8 mx-auto mb-1 text-emerald-700" /><p className="text-sm font-semibold text-emerald-900">{STATS.teachers} teachers</p></div>
                  </div>
                  <div className="relative h-48 rounded-xl overflow-hidden">
                    <Image src={PLACE.aboutValues} alt="Students collaborating in study group" fill sizes="(max-width: 1024px) 50vw, 280px" className="object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ACADEMIC PROGRAMS ===== */}
      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Academy" title="Built on rigour. Designed for the world." lead="From Junior Secondary through Senior Secondary and beyond, our programs are mapped to the national curriculum and complemented by top-tier exam preparation." center />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BookOpen, title: "Junior Secondary School", desc: "Strong foundations across core subjects with a focus on critical thinking and personal development.", href: "/academics/jss", tag: "JSS 1–3", img: PLACE.programs.jss },
              { icon: GraduationCap, title: "Senior Secondary School", desc: "Broad subject choices and expert teaching tailored for academic and career success.", href: "/academics/sss", tag: "SS 1–3", img: PLACE.programs.sss },
              { icon: Trophy, title: "Exam Preparation", desc: "Specialised coaching for JAMB, WAEC, NECO, IELTS, SAT & TOEFL to help students excel.", href: "/academics/exam-prep", tag: "Local + International", img: PLACE.programs.examPrep },
              { icon: Award, title: "Admissions", desc: "Join a community of learners. Discover our admission process and requirements.", href: "/admission", tag: "Now Open", img: PLACE.programs.admissions },
            ].map(p => (
              <Card key={p.title} className="hover:shadow-lift transition-shadow overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={p.img} alt={p.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw" className="object-cover" />
                  <div className="absolute top-3 left-3 h-9 w-9 rounded-lg bg-white/95 backdrop-blur flex items-center justify-center shadow-sm">
                    <p.icon className="h-5 w-5 text-brand-700" />
                  </div>
                </div>
                <CardBody>
                  <Badge tone="gold" className="mb-2">{p.tag}</Badge>
                  <h3 className="text-lg font-semibold text-brand-900">{p.title}</h3>
                  <p className="mt-2 text-slate-600 text-sm leading-relaxed">{p.desc}</p>
                  <Link href={p.href} className="mt-4 inline-flex items-center gap-1 text-brand-700 font-medium text-sm hover:gap-2 transition-all">Learn more <ChevronRight className="h-4 w-4" /></Link>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS + EXAMS BAND ===== */}
      <section className="bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-12 grid lg:grid-cols-2 gap-8 items-center">
          <div className="flex flex-wrap items-center gap-8 lg:gap-12">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center"><Users className="h-6 w-6 text-gold-300" /></div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{STATS.alumni}</p>
                <p className="text-xs text-slate-300 mt-1">Alumni</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center"><GraduationCap className="h-6 w-6 text-gold-300" /></div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{STATS.teachers}</p>
                <p className="text-xs text-slate-300 mt-1">Teachers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-white/10 flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-gold-300" /></div>
              <div>
                <p className="text-3xl font-bold text-gold-400 leading-none">{STATS.yearsExperience}</p>
                <p className="text-xs text-slate-300 mt-1">Years Experience</p>
              </div>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white mb-3">Exams We Prepare For</p>
            <div className="flex flex-wrap gap-2">
              {EXAMS.map(e => (
                <span key={e} className="px-3 py-1.5 rounded-md border border-gold-400 text-gold-300 text-xs font-semibold tracking-wide">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHY CHOOSE ===== */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Why Meclones" title="Six reasons parents choose us." center />
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, title: "Proven academic results", desc: "98% WAEC pass rate. Top 10 SAT scores in Lagos. 70% of our SS3 cohort earns university admission with scholarships." },
              { icon: ShieldCheck, title: "Safe & secure campus", desc: "Gated facility with 24/7 security, CCTV coverage, trained nurses, and a strict child-safeguarding policy." },
              { icon: Brain, title: "Smart school technology", desc: "AI-assisted learning, online CBT, e-library, and a real-time parent portal — all on one platform." },
              { icon: Users, title: "Small classes, real attention", desc: "22 students per class on average. Teachers know every child by name, strengths, and growth areas." },
              { icon: BookOpen, title: "Globally informed curriculum", desc: "Nigerian curriculum strengthened with Cambridge methods, public speaking, coding, and entrepreneurship." },
              { icon: MessageCircle, title: "Always-on parent communication", desc: "WhatsApp alerts for attendance, fees, results. Direct messaging with form teachers. No more 'I didn't know'." },
            ].map(f => (
              <div key={f.title} className="rounded-xl p-6 border border-slate-200 hover:border-brand-300 hover:shadow-card transition-all bg-white">
                <div className="h-11 w-11 rounded-lg bg-brand-700/10 flex items-center justify-center mb-4"><f.icon className="h-5 w-5 text-brand-700" /></div>
                <h3 className="font-semibold text-brand-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ADMISSION PROCESS ===== */}
      <section className="section bg-gradient-to-br from-brand-900 to-brand-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold tracking-wide uppercase text-gold-300 mb-2">Admission Process</p>
            <h2 className="text-3xl md:text-4xl font-bold leading-tight">Four simple steps to join Meclones</h2>
            <p className="mt-4 text-slate-300">Most families complete their application in under 15 minutes. WhatsApp confirmations keep you in the loop.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-4 gap-6">
            {[
              { n: "01", t: "Online Application", d: "Fill the secure form and upload your child's report card and passport." },
              { n: "02", t: "WhatsApp Confirmation", d: "Receive a confirmation message with your application reference within minutes." },
              { n: "03", t: "Entrance Exam", d: "Sit for our age-appropriate entrance examination (online or on-campus)." },
              { n: "04", t: "Admission Offer", d: "Successful candidates receive an offer letter and onboarding pack." },
            ].map(s => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-bold text-gold-400/40 mb-2">{s.n}</div>
                <h3 className="font-semibold text-lg">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/apply"><Button variant="gold" className="px-6 py-3 text-base">Start Your Application</Button></Link>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What parents & students say" title="Trusted by Lagos families." center />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { name: "Mrs. Adebola Johnson", role: "Parent", q: "Meclones College Lekki has been a blessing to our family. The teachers are dedicated and my child has grown in confidence and knowledge.", stars: 5, avatar: PLACE.testimonialAvatars.adebola },
              { name: "Daniel Oladipo", role: "SS 2 Student", q: "The school has helped me discover my strengths and prepared me well for my exams. I am proud to be a Meclonian.", stars: 5, avatar: PLACE.testimonialAvatars.daniel },
              { name: "Dr. Bisi Adeyemi", role: "Alumni (2019)", q: "Meclones gave me a foundation I'm still building on at university. The character training was as serious as the academics.", stars: 5, avatar: null },
            ].map(t => (
              <Card key={t.name}>
                <CardBody>
                  <div className="flex items-center gap-3 mb-3">
                    {t.avatar ? (
                      <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-gold-200 shrink-0">
                        <Image src={t.avatar} alt={t.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-sm shrink-0">
                        {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex gap-0.5">
                        {Array.from({ length: t.stars }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />)}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Verified</p>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed">"{t.q}"</p>
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="font-semibold text-brand-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LIFE AT MECLONES (Instagram-style grid) ===== */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-10">
            <SectionHeading eyebrow="Campus life" title="Life at Meclones" />
            <a href={SCHOOL.socials.instagram} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900">
              Follow us @meclonescollege <ChevronRight className="h-4 w-4" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PLACE.lifeAtMeclones.map(g => (
              <div key={g.label} className="aspect-[4/3] rounded-xl relative overflow-hidden group cursor-pointer">
                <Image src={g.src} alt={g.label} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">{g.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GET IN TOUCH ===== */}
      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-8 items-stretch">
            <div className="lg:col-span-2 rounded-2xl text-white p-8 flex flex-col justify-between min-h-[280px] relative overflow-hidden">
              <Image src={PLACE.aboutHero} alt="Meclones College campus" fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover -z-10" />
              <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-900/85 to-brand-800/80" />
              <div className="relative">
                <Badge tone="gold" className="mb-3">Get in Touch</Badge>
                <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight">Have questions or want to learn more? We'd love to hear from you.</h3>
              </div>
              <div className="relative mt-6 space-y-2 text-sm text-slate-200">
                <p>{SCHOOL.address}</p>
                <p>{SCHOOL.phone} · {SCHOOL.email}</p>
              </div>
            </div>
            <form className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-card grid sm:grid-cols-2 gap-4" action="/api/contact" method="POST">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500">Full Name</label>
                <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Email Address</label>
                <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Phone Number</label>
                <input name="phone" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500">I am a…</label>
                <select name="role" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400">
                  <option value="" disabled>Choose one</option>
                  <option>Prospective parent</option>
                  <option>Prospective student</option>
                  <option>Current parent</option>
                  <option>Alumni</option>
                  <option>Vendor / Partner</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-500">Your Message</label>
                <textarea name="message" required rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="gold" className="px-5 py-2.5">Send Message <ArrowRight className="h-4 w-4" /></Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ===== NEWS / GALLERY TEASER ===== */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <SectionHeading eyebrow="News & Events" title="What's happening at Meclones" />
            <Link href="/news" className="hidden md:inline-flex items-center gap-1 text-brand-700 font-medium text-sm">All news <ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { tag: "Event", title: "Inter-house Sports 2026", date: "May 22, 2026", body: "All students compete in athletics, swimming, and team events across our four houses.", img: PLACE.news.interhouse },
              { tag: "Achievement", title: "Mock WAEC: 100% credits in Maths", date: "May 8, 2026", body: "Every SS3 student scored a credit or better in Mathematics in our final mock WAEC.", img: PLACE.news.mockWAEC },
              { tag: "Notice", title: "PTA Meeting — May 30", date: "May 14, 2026", body: "Quarterly PTA meeting holds 10am in the school hall. Parents are warmly invited.", img: PLACE.news.ptaMeeting },
            ].map(n => (
              <Card key={n.title} className="hover:shadow-lift transition-shadow overflow-hidden">
                <div className="relative h-44 bg-slate-100">
                  <Image src={n.img} alt={n.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                </div>
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone="info">{n.tag}</Badge>
                    <span className="text-xs text-slate-500">{n.date}</span>
                  </div>
                  <h3 className="font-semibold text-brand-900">{n.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{n.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="bg-gold-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-brand-900">Ready to give your child a Meclones education?</h2>
            <p className="mt-2 text-brand-800">Applications take less than 15 minutes. We'll guide you the rest of the way.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/apply"><Button className="bg-brand-900 text-white hover:bg-brand-950 px-5 py-3 text-base">Apply Now</Button></Link>
            <Link href="/contact"><Button variant="outline" className="bg-white border-brand-900 text-brand-900 px-5 py-3 text-base">Contact Us</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
