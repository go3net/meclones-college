import { notFound } from "next/navigation";
import { ArrowRight, Phone, Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool } from "../../data";

export default function SampleSchoolContact({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* Hero with imagery */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.9)} 0%, ${hexAlpha(school.theme.primary, 0.6)} 100%), url('${school.imagery.campus[1]}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: school.theme.onPrimary,
        }}
      >
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Contact</p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl ${school.theme.headingClass} max-w-3xl leading-tight drop-shadow-lg`}>
            Get in touch with the {school.shortName} office.
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">
            Whether you're enquiring about admissions, requesting a school tour, or just want to know more — we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact grid */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-5">
          <ContactCard
            icon={<Phone className="h-5 w-5" />}
            label="Call us"
            primary={school.contact.phone}
            secondary={school.contact.hours}
            href={`tel:${school.contact.phone}`}
            school={school}
          />
          <ContactCard
            icon={<Mail className="h-5 w-5" />}
            label="Email us"
            primary={school.contact.email}
            secondary="We reply within one working day"
            href={`mailto:${school.contact.email}`}
            school={school}
          />
          <ContactCard
            icon={<MapPin className="h-5 w-5" />}
            label="Visit us"
            primary={school.contact.addressLines[0]}
            secondary={school.contact.addressLines.slice(1).join(", ")}
            school={school}
          />
        </div>
      </section>

      {/* Two-column: form + opening hours */}
      <section
        className="py-16 sm:py-20"
        style={{ backgroundColor: school.theme.surface }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-10">
          {/* Form (inert sample) */}
          <div className="lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Send a message</p>
            <h2 className={`text-3xl ${school.theme.headingClass} mb-5`} style={{ color: school.theme.primary }}>
              Drop us a line
            </h2>
            <form
              action="/for-schools#demo"
              className="space-y-4 rounded-2xl p-6 border"
              style={{
                backgroundColor: school.theme.bg,
                borderColor: `${school.theme.primary}1A`,
              }}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <SampleField label="Your name" type="text" name="name" themeText={school.theme.text} surface={school.theme.surface} primary={school.theme.primary} />
                <SampleField label="Email" type="email" name="email" themeText={school.theme.text} surface={school.theme.surface} primary={school.theme.primary} />
              </div>
              <SampleField label="Subject" type="text" name="subject" themeText={school.theme.text} surface={school.theme.surface} primary={school.theme.primary} />
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 opacity-70">Message</label>
                <textarea
                  rows={5}
                  className="w-full rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm"
                  style={{
                    borderColor: `${school.theme.primary}33`,
                    backgroundColor: school.theme.surface,
                    color: school.theme.text,
                  }}
                />
              </div>
              <p className="text-xs opacity-60 italic">
                Sample form — submissions go back to the {school.shortName} pitch page. Your real site would deliver to your inbox.
              </p>
              <button
                type="submit"
                className="px-6 py-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-90"
                style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
              >
                Send message <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* Side panel — hours + quick links */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] font-semibold mb-3" style={{ color: school.theme.accent }}>Office hours</p>
            <h2 className={`text-3xl ${school.theme.headingClass} mb-5`} style={{ color: school.theme.primary }}>When to find us</h2>
            <ul className="space-y-3 text-sm">
              {[
                { day: "Monday", hours: "7:30 – 16:30" },
                { day: "Tuesday", hours: "7:30 – 16:30" },
                { day: "Wednesday", hours: "7:30 – 16:30" },
                { day: "Thursday", hours: "7:30 – 16:30" },
                { day: "Friday", hours: "7:30 – 15:00" },
                { day: "Saturday", hours: "By appointment" },
                { day: "Sunday", hours: "Closed" },
              ].map(d => (
                <li key={d.day} className="flex items-center justify-between border-b pb-2"
                    style={{ borderColor: `${school.theme.primary}1A` }}>
                  <span className="opacity-80">{d.day}</span>
                  <span className="font-semibold" style={{ color: school.theme.primary }}>{d.hours}</span>
                </li>
              ))}
            </ul>
            <div
              className="mt-7 rounded-xl p-5 flex items-start gap-3"
              style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
            >
              <Clock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: school.theme.accent }} />
              <div>
                <p className={`text-sm ${school.theme.headingClass}`}>Out of hours?</p>
                <p className="text-xs opacity-80 mt-1 leading-relaxed">
                  The duty phone is monitored from 6am – 9pm daily during term-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom WhatsApp strip */}
      <section
        className="py-12 text-center"
        style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <MessageSquare className="h-10 w-10 mx-auto mb-4" style={{ color: school.theme.accent }} />
          <h3 className={`text-2xl ${school.theme.headingClass}`}>Prefer WhatsApp?</h3>
          <p className="opacity-80 mt-2 mb-5">
            Message the school office on WhatsApp — fastest reply during the working week.
          </p>
          <a
            href={`https://wa.me/2348095550101?text=${encodeURIComponent(`Hi ${school.shortName} — I have a question.`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
          >
            Open WhatsApp <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </>
  );
}

function ContactCard({
  icon, label, primary, secondary, href, school,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
  href?: string;
  school: SampleSchool;
}) {
  const Inner = (
    <>
      <div
        className="h-11 w-11 rounded-lg flex items-center justify-center mb-4"
        style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
      >
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wider opacity-60">{label}</p>
      <p className={`text-base mt-1 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{primary}</p>
      {secondary && <p className="text-xs opacity-70 mt-1">{secondary}</p>}
    </>
  );
  const className = "block rounded-xl border p-6 transition-all hover:shadow-md";
  const style = {
    backgroundColor: school.theme.bg,
    borderColor: `${school.theme.primary}1A`,
  } as React.CSSProperties;
  return href
    ? <a href={href} className={className} style={style}>{Inner}</a>
    : <div className={className} style={style}>{Inner}</div>;
}

function SampleField({
  label, type, name, themeText, surface, primary,
}: {
  label: string; type: string; name: string;
  themeText: string; surface: string; primary: string;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider font-semibold mb-1.5 opacity-70">{label}</label>
      <input
        type={type}
        name={name}
        className="w-full rounded-lg px-3 py-2.5 border focus:outline-none focus:ring-2 text-sm"
        style={{
          borderColor: `${primary}33`,
          backgroundColor: surface,
          color: themeText,
        }}
      />
    </div>
  );
}
