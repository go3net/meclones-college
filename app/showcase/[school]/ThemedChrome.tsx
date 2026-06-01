"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Phone, Mail, MapPin } from "lucide-react";
import type { SampleSchool } from "../data";

/**
 * Header + footer for one sample school. Driven entirely by the
 * SampleSchool definition — colours, fonts, monogram all come from
 * the data file so every sample looks distinct without touching the
 * shared theme.
 */
export function ThemedHeader({ school }: { school: SampleSchool }) {
  const [open, setOpen] = useState(false);
  const base = `/showcase/${school.slug}`;
  const nav = [
    { label: "Home", href: base },
    { label: "About", href: `${base}/about` },
    { label: "Admissions", href: `${base}/admissions` },
    { label: "Contact", href: `${base}/contact` },
  ];

  return (
    <header
      className="border-b sticky top-0 z-30 backdrop-blur"
      style={{
        backgroundColor: `${school.theme.bg}EE`,
        borderColor: `${school.theme.primary}1A`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
        <Link href={base} className="flex items-center gap-3 group">
          <span
            className="h-11 w-11 rounded-lg flex items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: school.theme.primary, color: school.theme.accent }}
          >
            <span className={`text-xl ${school.theme.headingClass}`}>{school.monogram}</span>
          </span>
          <span className="leading-tight">
            <span className={`block text-base sm:text-lg ${school.theme.headingClass}`} style={{ color: school.theme.primary }}>
              {school.name}
            </span>
            <span className="block text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: school.theme.accent }}>
              {school.tagline}
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {nav.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={`text-sm font-medium hover:opacity-70 transition-opacity ${school.theme.bodyClass}`}
              style={{ color: school.theme.text }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/portal/login"
            className="text-sm font-semibold rounded-full px-4 py-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
          >
            Parent portal
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle navigation"
          className="md:hidden p-2 rounded-lg"
          style={{ color: school.theme.primary }}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          className="md:hidden border-t px-4 py-3 space-y-1"
          style={{ borderColor: `${school.theme.primary}1A`, backgroundColor: school.theme.bg }}
        >
          {nav.map(n => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium"
              style={{ color: school.theme.text }}
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/portal/login"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 mt-1 rounded-lg text-sm font-semibold text-center"
            style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
          >
            Parent portal
          </Link>
        </nav>
      )}
    </header>
  );
}

export function ThemedFooter({ school }: { school: SampleSchool }) {
  return (
    <footer
      className="mt-20"
      style={{ backgroundColor: school.theme.primary, color: school.theme.onPrimary }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: school.theme.accent, color: school.theme.primary }}
            >
              <span className={`text-lg ${school.theme.headingClass}`}>{school.monogram}</span>
            </span>
            <span className={`text-base ${school.theme.headingClass}`}>{school.shortName}</span>
          </div>
          <p className="text-sm opacity-80 leading-relaxed">{school.tagline}.</p>
          <p className="text-xs opacity-60 mt-3">{school.established}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: school.theme.accent }}>Visit</p>
          <p className="text-sm flex items-start gap-2 opacity-90">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" style={{ color: school.theme.accent }} />
            <span>
              {school.contact.addressLines.map((l, i) => (
                <span key={i} className="block">{l}</span>
              ))}
            </span>
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: school.theme.accent }}>Contact</p>
          <p className="text-sm flex items-center gap-2 opacity-90 mb-2">
            <Phone className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} />
            <a href={`tel:${school.contact.phone}`} className="hover:opacity-80">{school.contact.phone}</a>
          </p>
          <p className="text-sm flex items-center gap-2 opacity-90">
            <Mail className="h-4 w-4 shrink-0" style={{ color: school.theme.accent }} />
            <a href={`mailto:${school.contact.email}`} className="hover:opacity-80 break-all">{school.contact.email}</a>
          </p>
          <p className="text-xs opacity-60 mt-3">{school.contact.hours}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: school.theme.accent }}>Quick links</p>
          <ul className="space-y-1.5 text-sm opacity-90">
            <li><Link href={`/showcase/${school.slug}/about`} className="hover:opacity-80">About the school</Link></li>
            <li><Link href={`/showcase/${school.slug}/admissions`} className="hover:opacity-80">Admissions</Link></li>
            <li><Link href={`/showcase/${school.slug}/contact`} className="hover:opacity-80">Contact us</Link></li>
            <li><Link href="/portal/login" className="hover:opacity-80">Parent / staff portal</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: `${school.theme.accent}33` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs opacity-60 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} {school.name}. All rights reserved.</span>
          <span>
            Sample design ·{" "}
            <Link href="/for-schools" className="underline hover:opacity-80">
              Build a site like this for your school →
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
