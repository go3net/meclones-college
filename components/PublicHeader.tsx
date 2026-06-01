"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  {
    label: "Academics",
    children: [
      { href: "/academics", label: "Overview" },
      { href: "/academics/jss", label: "Junior Secondary" },
      { href: "/academics/sss", label: "Senior Secondary" },
      { href: "/academics/exam-prep", label: "WAEC / IGCSE / SAT" },
    ],
  },
  { href: "/admission", label: "Admission" },
  { href: "/gallery", label: "Gallery" },
  { href: "/news", label: "News" },
  { href: "/parents", label: "Parents" },
  { href: "/for-schools", label: "For Schools" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const [acadOpen, setAcadOpen] = useState(false);
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-1">
            {NAV.map(item =>
              "children" in item ? (
                <div key={item.label} className="relative" onMouseEnter={() => setAcadOpen(true)} onMouseLeave={() => setAcadOpen(false)}>
                  <button className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-700 flex items-center gap-1">
                    {item.label} <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {acadOpen && (
                    <div className="absolute left-0 top-full pt-1 w-56">
                      <div className="bg-white rounded-lg shadow-lift border border-slate-100 py-2">
                        {item.children!.map(c => (
                          <Link key={c.href} href={c.href} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-brand-700">{c.label}</Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link key={item.href} href={item.href} className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-brand-700">{item.label}</Link>
              )
            )}
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <Link href="/portal/login"><Button variant="outline">Portal Login</Button></Link>
            <Link href="/apply"><Button variant="gold">Apply Now</Button></Link>
          </div>
          <button className="lg:hidden p-2 text-slate-700" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t border-slate-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {NAV.flatMap(item =>
              "children" in item
                ? [<p key={item.label} className="px-3 pt-2 pb-1 text-xs font-semibold uppercase text-slate-400">{item.label}</p>,
                  ...item.children!.map(c => (
                    <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block px-5 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded">{c.label}</Link>
                  ))]
                : [<Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded">{item.label}</Link>]
            )}
            <div className="pt-3 mt-2 border-t border-slate-100 flex gap-2">
              <Link href="/portal/login" className="flex-1" onClick={() => setOpen(false)}><Button variant="outline" className="w-full">Portal Login</Button></Link>
              <Link href="/apply" className="flex-1" onClick={() => setOpen(false)}><Button variant="gold" className="w-full">Apply Now</Button></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
