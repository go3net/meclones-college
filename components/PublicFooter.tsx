import Link from "next/link";
import { Logo } from "./Logo";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { getSchoolPublic } from "@/lib/tenant";

/** A footer link column. The platform host and a school get different ones. */
function LinkColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="font-semibold text-white mb-3">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(l => (
          <li key={l.href}><Link href={l.href} className="hover:text-gold-300">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export async function PublicFooter() {
  const school = await getSchoolPublic();
  // No tenant = the SchoolBot product site; the school pages don't exist there.
  const isPlatform = school.id === null;
  const blurb = isPlatform
    ? "The school management product parents and teachers don't have to learn. Fees, results, attendance and messaging, all from WhatsApp."
    : "Raising confident, responsible students equipped to make a positive impact in a dynamic world.";
  const columns = isPlatform
    ? [
        { title: "Product", links: [
          { href: "/", label: "Home" },
          { href: "/whatsapp", label: "How it works" },
          { href: "/#pricing", label: "Pricing" },
          { href: "/#demo", label: "Request a demo" },
        ] },
        { title: "For schools", links: [
          { href: "/showcase", label: "Sample school websites" },
          { href: "/portal/login", label: "Portal login" },
        ] },
      ]
    : [
        { title: "Quick Links", links: [
          { href: "/", label: "Home" },
          { href: "/about", label: "About Us" },
          { href: "/academics", label: "Academy" },
          { href: "/admission", label: "Admissions" },
          { href: "/news", label: "News & Events" },
          { href: "/gallery", label: "Gallery" },
          { href: "/contact", label: "Contact" },
          { href: "/portal/login", label: "Parent Portal" },
        ] },
        { title: "Academy", links: [
          { href: "/academics/jss", label: "JSS 1–3" },
          { href: "/academics/sss", label: "SS 1–3" },
          { href: "/academics/exam-prep", label: "Exam Preparation" },
          { href: "/academics#co-curricular", label: "Co-Curricular" },
        ] },
      ];
  return (
    <>
      {/* Contact info strip (sits directly above footer) */}
      <section className="bg-brand-900 text-slate-100 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid sm:grid-cols-3 gap-4 text-sm">
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address)}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-gold-400" />
            </span>
            <span className="leading-tight">{school.address}</span>
          </a>
          <a href={`tel:${school.phoneIntl}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-gold-400" />
            </span>
            <span className="font-medium">{school.phone}</span>
          </a>
          <a href={`mailto:${school.email}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-gold-400" />
            </span>
            <span>{school.email}</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-900 text-slate-300 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <Logo variant="light" />
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">{blurb}</p>
            </div>

            {columns.map(col => <LinkColumn key={col.title} title={col.title} links={col.links} />)}

            <div>
              <p className="font-semibold text-white mb-3">Connect With Us</p>
              <div className="flex flex-wrap gap-3">
                {school.socials.facebook && (
                  <a aria-label="Facebook" href={school.socials.facebook} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {school.socials.instagram && (
                  <a aria-label="Instagram" href={school.socials.instagram} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {school.socials.youtube && (
                  <a aria-label="YouTube" href={school.socials.youtube} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
                {school.socials.linkedin && (
                  <a aria-label="LinkedIn" href={school.socials.linkedin} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="mt-6 text-xs text-slate-400 leading-relaxed">
                {school.hours}
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {school.name}. All Rights Reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-gold-300">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gold-300">Terms & Conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
