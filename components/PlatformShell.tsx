"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import clsx from "clsx";
import { Building2, LogOut, Menu, X, Globe } from "lucide-react";

/**
 * Chrome for the SchoolBot platform operator (PLATFORM_ADMIN). Kept
 * separate from PortalShell on purpose: platform users belong to no
 * school, so none of the school-scoped widgets (notifications, branch
 * switcher, global search) apply.
 */
const NAV = [
  { href: "/portal/platform/schools", label: "Schools", icon: Building2 },
];

export function PlatformShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const userName = session?.user?.name ?? "Platform admin";
  const userEmail = session?.user?.email ?? "";

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 bg-brand-900 text-slate-100 transform transition-transform lg:translate-x-0 lg:relative flex flex-col",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 ring-2 ring-gold-400/30 flex items-center justify-center font-serif font-bold text-gold-300">S</span>
            <div className="leading-tight">
              <p className="font-serif font-bold text-lg">SchoolBot</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-gold-300">Platform</p>
            </div>
          </div>
          <button className="lg:hidden text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active ? "bg-white/15 text-white font-medium" : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <Globe className="h-4 w-4" /> Sales site
          </Link>
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/portal/login" })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <button className="lg:hidden text-slate-700" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <p className="text-xs text-slate-500 hidden lg:block">SchoolBot · Platform admin</p>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-900 leading-tight">{userName}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{userEmail}</p>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-full overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
