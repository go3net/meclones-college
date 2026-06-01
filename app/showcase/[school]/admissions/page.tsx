import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, FileText, CheckCircle2, Phone, Mail } from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool } from "../../data";

export default function SampleSchoolAdmissions({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* Hero with imagery */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.9)} 0%, ${hexAlpha(school.theme.primary, 0.6)} 100%), url('${school.imagery.admissions}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: school.theme.onPrimary,
        }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Admissions</p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl ${school.theme.headingClass} max-w-3xl leading-tight drop-shadow-lg`}>
            Join the {school.shortName} family.
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">
            Applications for the 2026/27 academic session are open. We admit students into JSS 1, JSS 2, and SS 1 in the September intake; mid-year transfers are considered case by case.
          </p>
          <div className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold shadow-lg"
            style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}>
            <Calendar className="h-4 w-4" /> Next assessment day: <span className="font-extrabold">Saturday, 14 March</span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>The process</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              From enquiry to first day, in four steps
            </h2>
          </div>
          <ol className="space-y-5">
            {school.admissionsSteps.map(s => (
              <li
                key={s.step}
                className="grid sm:grid-cols-[80px_1fr] gap-4 sm:gap-6 p-6 rounded-xl border"
                style={{
                  backgroundColor: school.theme.bg,
                  borderColor: `${school.theme.primary}1A`,
                }}
              >
                <div className="shrink-0">
                  <p className={`text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.accent }}>{s.step}</p>
                </div>
                <div>
                  <h3 className={`text-xl mb-2 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{s.title}</h3>
                  <p className="text-sm opacity-80 leading-relaxed">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Documents required */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Bring with you</p>
              <h2 className={`text-3xl ${school.theme.headingClass} mb-5`} style={{ color: school.theme.primary }}>
                What we need on assessment day
              </h2>
              <ul className="space-y-3">
                {[
                  "A copy of the candidate's birth certificate",
                  "Two passport photographs (recent)",
                  "The most recent end-of-term report from current school",
                  "A reference letter from the candidate's current school",
                  "A completed application form (we send this on enquiry)",
                  "Application processing fee — payable on the day",
                ].map(d => (
                  <li key={d} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: school.theme.accent }} />
                    <span className="opacity-85 leading-relaxed">{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-2xl p-7"
              style={{
                backgroundColor: school.theme.primary,
                color: school.theme.onPrimary,
              }}
            >
              <FileText className="h-7 w-7 mb-4" style={{ color: school.theme.accent }} />
              <h3 className={`text-2xl mb-3 ${school.theme.headingClass}`}>Fees at a glance</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b pb-2 opacity-90" style={{ borderColor: `${school.theme.accent}33` }}>
                  <span>JSS 1 – JSS 3</span>
                  <span className={school.theme.headingClass}>₦ 380 – 450k / term</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2 opacity-90" style={{ borderColor: `${school.theme.accent}33` }}>
                  <span>SS 1 – SS 3</span>
                  <span className={school.theme.headingClass}>₦ 420 – 520k / term</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2 opacity-90" style={{ borderColor: `${school.theme.accent}33` }}>
                  <span>Boarding supplement</span>
                  <span className={school.theme.headingClass}>₦ 250k / term</span>
                </div>
                <div className="flex items-center justify-between pt-1 opacity-90">
                  <span>Application fee</span>
                  <span className={school.theme.headingClass}>₦ 25k</span>
                </div>
              </div>
              <p className="text-xs opacity-70 mt-5">Sibling discounts of 10% from the second child onwards. Annual-payment discounts available.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry form */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Start here</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              Send an enquiry
            </h2>
            <p className="mt-3 opacity-80">
              We respond to every enquiry within 24 hours during the working week.
            </p>
          </div>

          {/* Inert sample form — submitting routes back to /for-schools demo */}
          <form
            action="/for-schools#demo"
            className="space-y-4 rounded-2xl p-6 border"
            style={{
              backgroundColor: school.theme.bg,
              borderColor: `${school.theme.primary}1A`,
            }}
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
                style={{
                  borderColor: `${school.theme.primary}33`,
                  backgroundColor: school.theme.surface,
                }}
              />
            </div>
            <p className="text-xs opacity-60 italic">
              Sample form — submissions on this demo go back to the {school.shortName} pitch page. Your real site would send these to the admissions inbox.
            </p>
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              Submit enquiry <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-10 grid sm:grid-cols-2 gap-3 text-sm">
            <a href={`tel:${school.contact.phone}`} className="flex items-center gap-3 p-4 rounded-lg border"
               style={{ borderColor: `${school.theme.primary}1A`, backgroundColor: school.theme.surface }}>
              <Phone className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} />
              <span>
                <span className="block font-semibold" style={{ color: school.theme.primary }}>Call admissions</span>
                <span className="opacity-70">{school.contact.phone}</span>
              </span>
            </a>
            <a href={`mailto:${school.contact.email}`} className="flex items-center gap-3 p-4 rounded-lg border"
               style={{ borderColor: `${school.theme.primary}1A`, backgroundColor: school.theme.surface }}>
              <Mail className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} />
              <span>
                <span className="block font-semibold" style={{ color: school.theme.primary }}>Email admissions</span>
                <span className="opacity-70 break-all">{school.contact.email}</span>
              </span>
            </a>
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
        style={{
          borderColor: `${school.theme.primary}33`,
          backgroundColor: school.theme.surface,
        }}
      />
    </div>
  );
}
