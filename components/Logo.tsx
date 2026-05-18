import clsx from "clsx";
import { SCHOOL } from "@/lib/constants";

export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  const text = variant === "light" ? "text-white" : "text-brand-900";
  const sub = variant === "light" ? "text-gold-300" : "text-gold-600";
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center shadow-md ring-2 ring-gold-400/30">
        <span className="text-gold-300 font-serif font-bold text-lg leading-none">M</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-gold-400 ring-2 ring-white" />
      </div>
      <div className="leading-tight">
        <p className={clsx("font-serif font-bold text-lg tracking-tight", text)}>{SCHOOL.shortName}</p>
        <p className={clsx("text-[10px] font-semibold tracking-[0.14em] uppercase", sub)}>{SCHOOL.tagline}</p>
      </div>
    </div>
  );
}
