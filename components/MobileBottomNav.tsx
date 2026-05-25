"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Home, FileText, CreditCard, MessageSquare, Calendar, Users,
  CheckSquare, ShieldCheck,
} from "lucide-react";

interface Tab {
  href: string;
  label: string;
  icon: typeof Home;
}

const TABS_BY_ROLE: Record<string, Tab[]> = {
  parent: [
    { href: "/portal/parent", label: "Home", icon: Home },
    { href: "/portal/parent/results", label: "Results", icon: FileText },
    { href: "/portal/parent/fees", label: "Fees", icon: CreditCard },
    { href: "/portal/parent/messages", label: "Messages", icon: MessageSquare },
  ],
  teacher: [
    { href: "/portal/teacher", label: "Home", icon: Home },
    { href: "/portal/teacher/roster", label: "Homeroom", icon: Users },
    { href: "/portal/teacher/attendance", label: "Attendance", icon: CheckSquare },
    { href: "/portal/teacher/messages", label: "Messages", icon: MessageSquare },
  ],
  student: [
    { href: "/portal/student", label: "Home", icon: Home },
    { href: "/portal/student/results", label: "Results", icon: FileText },
    { href: "/portal/student/timetable", label: "Schedule", icon: Calendar },
    { href: "/portal/student/fees", label: "Fees", icon: CreditCard },
  ],
};

/**
 * Bottom tab bar for mobile-heavy roles (parent / teacher / student).
 * Surfaces the 4 most-used destinations alongside the existing
 * hamburger drawer. Staff roles (admin / director / accountant) keep
 * the sidebar-only experience — they're mostly desktop users.
 */
export function MobileBottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = TABS_BY_ROLE[role];
  if (!tabs) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-4">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-brand-700" : "text-slate-500 hover:text-slate-700",
              )}
            >
              <Icon className={clsx("h-5 w-5", active && "text-brand-700")} />
              <span className="leading-none">{tab.label}</span>
              {active && <span className="absolute top-0 h-0.5 w-10 bg-brand-700 rounded-b" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
