"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { Role as MockRole } from "@/lib/mock-data";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import clsx from "clsx";
import {
  Home, Users, GraduationCap, BookOpen, Calendar, FileText, MessageCircle,
  CreditCard, Brain, Smartphone, Settings, LogOut, Menu, X, Bell, ChevronDown,
  CheckSquare, BookMarked, Banknote, TrendingUp, ClipboardList, Megaphone,
  UserCircle2, ShieldCheck, KeyRound, Trophy, ScrollText,
} from "lucide-react";

interface NavItem { href: string; label: string; icon: any; }

// PortalShell takes the mock-data Role type (lowercase). NextAuth gives us
// UPPER_CASE Prisma roles; the mapper below bridges the two so the existing
// nav definitions don't need to change yet.
const ROLE_FROM_AUTH: Record<string, MockRole> = {
  SUPER_ADMIN: "director",
  DIRECTOR: "director",
  ADMIN: "school_admin",
  ACCOUNTANT: "accountant",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};

const NAV_BY_ROLE: Record<MockRole, NavItem[]> = {
  director: [
    { href: "/portal/director", label: "Overview", icon: Home },
    { href: "/portal/director/performance", label: "Performance", icon: TrendingUp },
    { href: "/portal/admin/students", label: "Students", icon: Users },
    { href: "/portal/admin/teachers", label: "Teachers", icon: GraduationCap },
    { href: "/portal/admin/parents", label: "Parents", icon: UserCircle2 },
    { href: "/portal/admin/staff", label: "Staff & Accounts", icon: KeyRound },
    { href: "/portal/admin/classes", label: "Classes", icon: ClipboardList },
    { href: "/portal/admin/subjects", label: "Subjects", icon: BookMarked },
    { href: "/portal/admin/results", label: "Results", icon: FileText },
    { href: "/portal/admin/awards", label: "Awards", icon: Trophy },
    { href: "/portal/admin/fees", label: "Fees", icon: Banknote },
    { href: "/portal/admin/applications", label: "Admissions", icon: ClipboardList },
    { href: "/portal/admin/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/portal/admin/complaints", label: "Complaints", icon: MessageCircle },
    { href: "/portal/admin/library", label: "Library", icon: BookOpen },
    { href: "/portal/director/permissions", label: "Permissions", icon: ShieldCheck },
    { href: "/portal/director/sessions", label: "Sessions", icon: Calendar },
    { href: "/portal/director/audit", label: "Audit Log", icon: ScrollText },
    { href: "/portal/whatsapp", label: "WhatsApp Logs", icon: Smartphone },
    { href: "/portal/director/settings", label: "Settings", icon: Settings },
  ],
  school_admin: [
    { href: "/portal/admin", label: "Overview", icon: Home },
    { href: "/portal/admin/students", label: "Students", icon: Users },
    { href: "/portal/admin/teachers", label: "Teachers", icon: GraduationCap },
    { href: "/portal/admin/parents", label: "Parents", icon: UserCircle2 },
    { href: "/portal/admin/staff", label: "Staff & Accounts", icon: KeyRound },
    { href: "/portal/admin/classes", label: "Classes", icon: ClipboardList },
    { href: "/portal/admin/subjects", label: "Subjects", icon: BookMarked },
    { href: "/portal/admin/results", label: "Results", icon: FileText },
    { href: "/portal/admin/awards", label: "Awards", icon: Trophy },
    { href: "/portal/admin/fees", label: "Fees", icon: Banknote },
    { href: "/portal/admin/applications", label: "Admissions", icon: ClipboardList },
    { href: "/portal/admin/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/portal/admin/complaints", label: "Complaints", icon: MessageCircle },
    { href: "/portal/admin/library", label: "Library", icon: BookOpen },
    { href: "/portal/whatsapp", label: "WhatsApp Logs", icon: Smartphone },
  ],
  teacher: [
    { href: "/portal/teacher", label: "Dashboard", icon: Home },
    { href: "/portal/teacher/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/teacher/results", label: "Score Entry", icon: FileText },
  ],
  parent: [
    { href: "/portal/parent", label: "Dashboard", icon: Home },
    { href: "/portal/parent/results", label: "Results", icon: FileText },
    { href: "/portal/parent/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/parent/fees", label: "Fees & Payments", icon: CreditCard },
    { href: "/portal/parent/complaints", label: "Complaints", icon: MessageCircle },
    { href: "/portal/parent/library", label: "Library", icon: BookOpen },
  ],
  student: [
    { href: "/portal/student", label: "Dashboard", icon: Home },
    { href: "/portal/student/results", label: "Results", icon: FileText },
    { href: "/portal/student/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/student/fees", label: "Fees", icon: CreditCard },
    { href: "/portal/student/library", label: "Library", icon: BookOpen },
  ],
  accountant: [
    { href: "/portal/accountant", label: "Dashboard", icon: Home },
    { href: "/portal/accountant/debtors", label: "Debtors", icon: Banknote },
    { href: "/portal/whatsapp", label: "WhatsApp Logs", icon: Smartphone },
  ],
};

const roleLabel: Record<MockRole, string> = {
  director: "Director", school_admin: "School Admin", teacher: "Teacher",
  parent: "Parent", student: "Student", accountant: "Accountant",
};

export function PortalShell({ role, children }: { role: MockRole; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/portal/login");
    }
  }, [status, router]);

  // Pick the sidebar nav from the user's actual auth role so e.g. a DIRECTOR
  // walking into /portal/admin/* still sees the director nav. The `role` prop
  // is the fallback (used during unauthenticated render). Route gating lives
  // entirely in `middleware.ts`.
  const authRole = (session?.user as { role?: string } | undefined)?.role;
  const effectiveRole: MockRole = authRole && ROLE_FROM_AUTH[authRole] ? ROLE_FROM_AUTH[authRole] : role;

  const doLogout = () => signOut({ callbackUrl: "/portal/login" });

  const nav = NAV_BY_ROLE[effectiveRole];

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";
  const userImage = (session?.user as { image?: string | null })?.image ?? null;
  const initials = userName.split(" ").map(n => n[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-40 w-64 bg-brand-900 text-slate-100 transform transition-transform lg:translate-x-0 lg:relative lg:flex flex-col",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <Logo variant="light" />
          <button className="lg:hidden text-white" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active ? "bg-white/15 text-white font-medium" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <button className="lg:hidden text-slate-700" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="hidden lg:block">
            <p className="text-xs text-slate-500">Portal · {roleLabel[effectiveRole]}</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 p-1 pr-2 hover:bg-slate-100 rounded-lg">
                <div className="relative h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold overflow-hidden">
                  {userImage ? <img src={userImage} alt={userName} className="absolute inset-0 h-full w-full object-cover" /> : initials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-900 leading-tight">{userName}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{roleLabel[effectiveRole]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lift border border-slate-100 py-1 z-30" onMouseLeave={() => setMenuOpen(false)}>
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{userName}</p>
                    <p className="text-xs text-slate-500">{userEmail}</p>
                  </div>
                  <Link href="/portal/me/profile" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">My profile</Link>
                  <Link href="/" className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">School website</Link>
                  <button onClick={doLogout} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-full overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
