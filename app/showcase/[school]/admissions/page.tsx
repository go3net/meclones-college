import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Calendar, FileText, CheckCircle2, Phone, Mail,
  Sparkles, HelpCircle, ChevronRight,
} from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool } from "../../data";

export default function SampleSchoolAdmissions({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ color: school.theme.onPrimary }}>
        <Image src={school.imagery.admissions} alt={`${school.shortName} admissions`} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.94)} 0%, ${hexAlpha(school.theme.primary, 0.7)} 100%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-36">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-4" style={{ color: school.theme.accent }}>Admissions</p>
          <h1 className={`text-4xl sm:text-5xl lg:text-7xl ${school.theme.headingClass} max-w-3xl leading-[1.04] drop-shadow-lg`}>
            Join the {school.shortName} family.
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">
            Applications for the 2026/27 academic session are now open. We admit students into JSS 1, JSS 2, and SS 1 in the September intake; mid-year transfers are considered case by case.
          </p>
          <div
            className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg"
            style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
          >
            <Calendar className="h-4 w-4" /> Next assessment day: <span className="font-extrabold">Saturday, 14 March</span>
          </div>
        </div>
      </section>

      {/* ===== KEY DATES ===== */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Key dates · 2026/27</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Mark these in your calendar
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { date: "14 Mar", title: "Assessment Day I", body: "Onsite written and oral assessment." },
              { date: "11 Apr", title: "Assessment Day II", body: "Second sitting for international applicants." },
              { date: "02 May", title: "Open Day", body: "Tour the grounds, meet the faculty, hear the choir." },
              { date: "21 May", title: "Offers issued", body: "Decisions confirmed by post and on the parent portal." },
            ].map(d => (
              <div
                key={d.title}
                className="rounded-2xl p-6 border bg-white shadow-sm hover:shadow-md transition-shadow"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <p className={`text-3xl ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{d.date}</p>
                <p className={`mt-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{d.title}</p>
                <p className="mt-1 text-sm opacity-70">{d.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PROCESS STEPS ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>The process</p>
            <h2 className={`text-3xl sm:text-4xl lg:text-5xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              From enquiry to first day, in four steps
            </h2>
          </div>
          <ol className="space-y-5">
            {school.admissionsSteps.map(s => (
              <li
                key={s.step}
                className="grid sm:grid-cols-[100px_1fr] gap-4 sm:gap-7 p-7 rounded-2xl border bg-white shadow-sm hover:shadow-lg transition-shadow"
                style={{ borderColor: `${school.theme.primary}1A` }}
              >
                <div className="shrink-0">
                  <p className={`text-5xl ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{s.step}</p>
                </div>
                <div>
                  <h3 className={`text-xl mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{s.title}</h3>
                  <p className="text-sm sm:text-base opacity-80 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== DOCUMENTS + FEES ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Bring with you</p>
              <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass} mb-6`} style={{ color: school.theme.primary }}>
                What we need on assessment day
              </h2>
              <ul className="space-y-3.5">
                {[
                  "A copy of the candidate's birth certificate",
                  "Two passport photographs (recent)",
                  "The most recent end-of-term report from current school",
                  "A reference letter from the candidate's current school",
                  "A completed application form (we send this on enquiry)",
                  "Application processing fee — payable on the day",
                ].map(d => (
                  <li key={d} className="flex gap-3 text-sm sm:text-base">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: school.theme.accent }} />
                    <span className="opacity-85 leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="relative rounded-3xl p-8 shadow-xl overflow-hidden"
              style={{ color: school.theme.onPrimary }}
            >
              <Image src={school.imagery.programs.admissions} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover -z-10" />
              <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.96)} 0%, ${hexAlpha(school.theme.primary, 0.88)} 100%)` }} />
              <FileText className="h-8 w-8 mb-5" style={{ color: school.theme.accent }} />
              <h3 className={`text-2xl mb-4 ${school.theme.headingClass}`}>Fees at a glance</h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: "JSS 1 – JSS 3", value: "₦ 380 – 450k / term" },
                  { label: "SS 1 – SS 3", value: "₦ 420 – 520k / term" },
                  { label: "Boarding supplement", value: "₦ 250k / term" },
                  { label: "Application fee", value: "₦ 25k" },
                ].map((row, i) => (
                  <div key={row.label} className={`flex items-center justify-between pb-2 ${i < 3 ? "border-b" : ""}`} style={{ borderColor: `${school.theme.accent}33` }}>
                    <span className="opacity-90">{row.label}</span>
                    <span className={school.theme.headingClass}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs opacity-70 mt-6 leading-relaxed">Sibling discounts of 10% from the second child onwards. Annual-payment discounts available.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ENQUIRY FORM ===== */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Start here</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Send an enquiry
            </h2>
            <p className="mt-4 opacity-80">We respond to every enquiry within 24 hours during the working week.</p>
          </div>

          <form
            action="/for-schools#demo"
            className="space-y-4 rounded-2xl p-6 sm:p-8 border shadow-sm"
            style={{ backgroundColor: school.theme.bg, borderColor: `${school.theme.primary}1A` }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Parent's full name" type="text" name="parent" school={school} />
              <Field label="Phone number" type="tel" name="phone" school={school} />
            </div>
            <Field label="Email address" type="email" name="email" school={school} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Candidate's name" type="text" name="candidate" school={school} />
              <Field label="Class applying for" type="text" name="class" placeholder="e.g. JSS 1" school={school} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 opacity-70">Anything we should know?</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.surface, color: school.theme.text }}
              />
            </div>
            <p className="text-xs opacity-60 italic">
              Sample form — submissions on this demo route back to the {school.shortName} pitch page.
            </p>
            <button
              type="submit"
              className="w-full px-6 py-3.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02] inline-flex items-center justify-center gap-2 shadow-md"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              Submit enquiry <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-10 grid sm:grid-cols-2 gap-3 text-sm">
            <a
              href={`tel:${school.contact.phone}`}
              className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-shadow"
              style={{ borderColor: `${school.theme.primary}1A`, backgroundColor: school.theme.surface }}
            >
              <Phone className="h-5 w-5 shrink-0" style={{ color: school.theme.accent }} />
              <span>
                <span className={`block font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>Call admissions</span>
                <span className="opacity-70">{school.contact.phone}</span>
              </span>
            </a>
            <a
              href={`mailto:${school.contact.email}`}
              className="flex items-center gap-3 p-4 rounded-xl border hover:shadow-md transition-shadow"
              style={{ borderColor: `${school.theme.primary}1A`, backgroundColor: school.theme.surface }}
            >
              <Mail className="h-5 w-5 shrink-0" style={{ color: school.theme.accent }} />
              <span>
                <span className={`block font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>Email admissions</span>
                <span className="opacity-70 break-all">{school.contact.email}</span>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20 sm:py-24" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>FAQ</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Honest answers
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "What's your acceptance rate?", a: "We aim for the best fit, not the lowest acceptance rate. Roughly 60% of applicants who meet our academic threshold receive an offer; we hold places for siblings and bursary candidates." },
              { q: "Do you offer scholarships?", a: `Yes. ${school.shortName} awards a small number of merit-based and need-based bursaries each year. Application is by referral from your child's current school.` },
              { q: "Is there a waiting list?", a: "For some year groups, yes. We hold a confidential waiting list and offer places as families relocate or move on." },
              { q: "Can I tour the school?", a: "Open days are termly. Private tours are available by appointment — contact the admissions office and we'll arrange a slot that suits you." },
              { q: "What's the entrance exam like?", a: "Age-appropriate, written, covering Mathematics, English, and general reasoning. Senior School applicants take an additional subject-specific paper. We aim to make candidates feel at ease — this is not designed to trick anyone." },
            ].map(item => (
              <details key={item.q} className="rounded-xl border bg-white group" style={{ borderColor: `${school.theme.primary}1A` }}>
                <summary className={`cursor-pointer px-5 py-4 font-semibold flex items-center justify-between list-none ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
                  <span className="flex items-center gap-3"><HelpCircle className="h-4 w-4" style={{ color: school.theme.accent }} /> {item.q}</span>
                  <ChevronRight className="h-4 w-4 opacity-50 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm opacity-80 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label, type, name, placeholder, school,
}: {
  label: string;
  type: string;
  name: string;
  placeholder?: string;
  school: SampleSchool;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 opacity-70">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm"
        style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.surface, color: school.theme.text }}
      />
    </div>
  );
}
