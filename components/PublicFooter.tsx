import Link from "next/link";
import { Logo } from "./Logo";
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { SCHOOL } from "@/lib/constants";

export function PublicFooter() {
  return (
    <>
      {/* Contact info strip (sits directly above footer) */}
      <section className="bg-brand-900 text-slate-100 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid sm:grid-cols-3 gap-4 text-sm">
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SCHOOL.address)}`} target="_blank" rel="noreferrer noopener" className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-gold-400" />
            </span>
            <span className="leading-tight">{SCHOOL.address}</span>
          </a>
          <a href={`tel:${SCHOOL.phoneIntl}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-gold-400" />
            </span>
            <span className="font-medium">{SCHOOL.phone}</span>
          </a>
          <a href={`mailto:${SCHOOL.email}`} className="flex items-center gap-3 hover:text-gold-300 transition-colors">
            <span className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-gold-400" />
            </span>
            <span>{SCHOOL.email}</span>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-900 text-slate-300 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-10">
            <div className="md:col-span-1">
              <Logo variant="light" />
              <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                Raising confident, responsible students equipped to make a positive impact in a dynamic world.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-3">Quick Links</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/" className="hover:text-gold-300">Home</Link></li>
                <li><Link href="/about" className="hover:text-gold-300">About Us</Link></li>
                <li><Link href="/academics" className="hover:text-gold-300">Academy</Link></li>
                <li><Link href="/admission" className="hover:text-gold-300">Admissions</Link></li>
                <li><Link href="/news" className="hover:text-gold-300">News & Events</Link></li>
                <li><Link href="/gallery" className="hover:text-gold-300">Gallery</Link></li>
                <li><Link href="/contact" className="hover:text-gold-300">Contact</Link></li>
                <li><Link href="/portal/login" className="hover:text-gold-300">Parent Portal</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-3">Academy</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/academics/jss" className="hover:text-gold-300">JSS 1–3</Link></li>
                <li><Link href="/academics/sss" className="hover:text-gold-300">SS 1–3</Link></li>
                <li><Link href="/academics/exam-prep" className="hover:text-gold-300">Exam Preparation</Link></li>
                <li><Link href="/academics#co-curricular" className="hover:text-gold-300">Co-Curricular</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-3">Connect With Us</p>
              <div className="flex flex-wrap gap-3">
                <a aria-label="Facebook" href={SCHOOL.socials.facebook} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a aria-label="Instagram" href={SCHOOL.socials.instagram} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
                <a aria-label="YouTube" href={SCHOOL.socials.youtube} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                  <Youtube className="h-4 w-4" />
                </a>
                <a aria-label="LinkedIn" href={SCHOOL.socials.linkedin} target="_blank" rel="noreferrer noopener" className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold-400 hover:text-brand-900 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-6 text-xs text-slate-400 leading-relaxed">
                {SCHOOL.hours}
              </p>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} {SCHOOL.name}. All Rights Reserved.</p>
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
