import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Phone, Mail, MapPin, Clock, MessageSquare, Send } from "lucide-react";
import { getSampleSchool, hexAlpha, type SampleSchool } from "../../data";

export default function SampleSchoolContact({ params }: { params: { school: string } }) {
  const school = getSampleSchool(params.school);
  if (!school) notFound();

  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" style={{ color: school.theme.onPrimary }}>
        <Image src={school.imagery.contact} alt={`${school.shortName} campus`} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.94)} 0%, ${hexAlpha(school.theme.primary, 0.68)} 100%)` }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-4" style={{ color: school.theme.accent }}>Contact</p>
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl ${school.theme.headingClass} max-w-3xl leading-tight drop-shadow-lg`}>
            Get in touch with the {school.shortName} office.
          </h1>
          <p className="mt-6 text-lg sm:text-xl opacity-90 max-w-2xl leading-relaxed">
            Whether you're enquiring about admissions, requesting a school tour, or just want to know more — we'd love to hear from you.
          </p>
        </div>
      </section>

      {/* ===== CONTACT CARDS ===== */}
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

      {/* ===== SPLIT: PHOTO CARD + FORM ===== */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: school.theme.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-6 items-stretch">
          {/* Photo card */}
          <div className="lg:col-span-2 rounded-3xl text-white p-8 flex flex-col justify-between min-h-[320px] relative overflow-hidden shadow-xl">
            <Image src={school.imagery.hero} alt={`${school.shortName} campus`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover -z-10" />
            <div className="absolute inset-0 -z-10" style={{ background: `linear-gradient(135deg, ${hexAlpha(school.theme.primary, 0.95)} 0%, ${hexAlpha(school.theme.primary, 0.82)} 100%)` }} />
            <div className="relative">
              <span
                className="inline-block text-[10px] uppercase tracking-[0.22em] font-bold px-3 py-1.5 rounded-full mb-5"
                style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
              >
                Get in touch
              </span>
              <h3 className={`text-2xl sm:text-3xl leading-tight ${school.theme.headingClass}`}>
                We'd love to hear from you.
              </h3>
              <p className="mt-3 opacity-85 text-sm sm:text-base leading-relaxed">
                Drop us a line — admissions, tours, alumni, vendors, press. The office answers every message.
              </p>
            </div>
            <div className="relative mt-8 space-y-2.5 text-sm opacity-90">
              <p className="flex items-start gap-2.5"><MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: school.theme.accent }} /> {school.contact.addressLines.join(", ")}</p>
              <p className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} /> {school.contact.phone}</p>
              <p className="flex items-center gap-2.5"><Mail className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} /> {school.contact.email}</p>
            </div>
          </div>

          {/* Form */}
          <form
            action="/for-schools#demo"
            className="lg:col-span-3 rounded-3xl border p-6 md:p-8 shadow-sm grid sm:grid-cols-2 gap-4"
            style={{ backgroundColor: school.theme.bg, borderColor: `${school.theme.primary}1A` }}
          >
            <div className="sm:col-span-2">
              <Label school={school}>Full name</Label>
              <input className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg, color: school.theme.text }} />
            </div>
            <div>
              <Label school={school}>Email</Label>
              <input type="email" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg, color: school.theme.text }} />
            </div>
            <div>
              <Label school={school}>Phone</Label>
              <input type="tel" className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg, color: school.theme.text }} />
            </div>
            <div className="sm:col-span-2">
              <Label school={school}>I am a…</Label>
              <select className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg, color: school.theme.text }}>
                <option>Prospective parent</option>
                <option>Prospective student</option>
                <option>Current parent</option>
                <option>Alumni</option>
                <option>Vendor / Partner</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label school={school}>Your message</Label>
              <textarea rows={4} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: `${school.theme.primary}33`, backgroundColor: school.theme.bg, color: school.theme.text }} />
            </div>
            <p className="sm:col-span-2 text-xs opacity-60 italic">Sample form — submissions route back to the {school.shortName} pitch page.</p>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-lg text-sm font-bold transition-all hover:scale-105 inline-flex items-center gap-2 shadow-md"
                style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
              >
                Send message <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ===== OFFICE HOURS + LOCATION ===== */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] font-semibold mb-3" style={{ color: school.theme.accent }}>Office hours</p>
            <h2 className={`text-3xl sm:text-4xl ${school.theme.headingClass} mb-6`} style={{ color: school.theme.primary }}>When to find us</h2>
            <ul className="space-y-3 text-sm">
              {[
                { day: "Monday", hours: school.contact.hours.split("·")[1]?.trim() ?? "8:00 – 16:00" },
                { day: "Tuesday", hours: school.contact.hours.split("·")[1]?.trim() ?? "8:00 – 16:00" },
                { day: "Wednesday", hours: school.contact.hours.split("·")[1]?.trim() ?? "8:00 – 16:00" },
                { day: "Thursday", hours: school.contact.hours.split("·")[1]?.trim() ?? "8:00 – 16:00" },
                { day: "Friday", hours: "8:00 – 15:00" },
                { day: "Saturday", hours: "By appointment" },
                { day: "Sunday", hours: "Closed" },
              ].map(d => (
                <li key={d.day} className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: `${school.theme.primary}1A` }}>
                  <span className="opacity-80">{d.day}</span>
                  <span className={`font-semibold ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{d.hours}</span>
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

          {/* "Map" — photographic locator card */}
          <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[420px]" style={{ color: school.theme.onPrimary }}>
            <Image src={school.imagery.about} alt={`${school.shortName} location`} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 50%, ${hexAlpha(school.theme.primary, 0.9)} 100%)` }} />
            <div className="absolute inset-0 flex items-end p-7">
              <div>
                <span
                  className="inline-block text-[10px] uppercase tracking-[0.22em] font-bold px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
                >
                  Find us
                </span>
                <p className={`text-2xl mb-2 ${school.theme.headingClass}`}>{school.contact.addressLines[0]}</p>
                <p className="text-sm opacity-90">{school.contact.addressLines.slice(1).join(" · ")}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(school.contact.addressLines.join(", "))}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline opacity-90 hover:opacity-100"
                >
                  Open in Google Maps <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHATSAPP CTA ===== */}
      <section className="py-14" style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <MessageSquare className="h-10 w-10 mx-auto mb-4" style={{ color: school.theme.accent }} />
          <h3 className={`text-2xl sm:text-3xl ${school.theme.headingClass}`}>Prefer WhatsApp?</h3>
          <p className="opacity-80 mt-3 mb-6 leading-relaxed max-w-xl mx-auto">
            Message the school office on WhatsApp — fastest reply during the working week.
          </p>
          <a
            href={`https://wa.me/2348095550101?text=${encodeURIComponent(`Hi ${school.shortName} — I have a question.`)}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-bold shadow-xl hover:scale-105 transition-transform"
            style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
          >
            Open WhatsApp <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </>
  );
}

function Label({ children, school }: { children: React.ReactNode; school: SampleSchool }) {
  return <label className="block text-xs uppercase tracking-wider font-semibold opacity-70">{children}</label>;
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
        className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
      >
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wider opacity-60 font-semibold">{label}</p>
      <p className={`text-base sm:text-lg mt-1.5 ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>{primary}</p>
      {secondary && <p className="text-xs opacity-70 mt-1">{secondary}</p>}
    </>
  );
  const className = "block rounded-2xl border p-7 transition-all hover:shadow-lg hover:-translate-y-0.5";
  const style = { backgroundColor: school.theme.bg, borderColor: `${school.theme.primary}1A` } as React.CSSProperties;
  return href
    ? <a href={href} className={className} style={style}>{Inner}</a>
    : <div className={className} style={style}>{Inner}</div>;
}
