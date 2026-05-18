"use client";
import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import clsx from "clsx";

// ----- Button -----
type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all px-4 py-2.5 text-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles: Record<BtnVariant, string> = {
    primary: "bg-brand-700 text-white hover:bg-brand-800 focus:ring-brand-400 shadow-sm",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-slate-300",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-300",
    ghost: "text-slate-700 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-300",
    gold: "bg-gold-400 text-brand-900 hover:bg-gold-300 focus:ring-gold-300 shadow-sm font-semibold",
  };
  return (
    <button className={clsx(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

// ----- Card -----
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl bg-white border border-slate-200 shadow-card", className)}>
      {children}
    </div>
  );
}
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3", className)}>{children}</div>;
}
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={clsx("text-base font-semibold text-slate-900", className)}>{children}</h3>;
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("p-5", className)}>{children}</div>;
}

// ----- Inputs -----
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400",
        props.className
      )}
    />
  );
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 min-h-[100px]",
        props.className
      )}
    />
  );
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400",
        props.className
      )}
    />
  );
}
export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return <label htmlFor={htmlFor} className={clsx("block text-sm font-medium text-slate-700 mb-1.5", className)}>{children}</label>;
}

// ----- Badge -----
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";
export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800",
    info: "bg-sky-100 text-sky-800",
    gold: "bg-gold-100 text-gold-800",
  };
  return (
    <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

// ----- Stat card -----
export function StatCard({
  label, value, hint, icon, accent = "brand",
}: {
  label: string; value: string | number; hint?: string; icon?: ReactNode;
  accent?: "brand" | "gold" | "emerald" | "amber" | "sky" | "rose";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
          </div>
          {icon && <div className={clsx("h-10 w-10 rounded-lg flex items-center justify-center", accents[accent])}>{icon}</div>}
        </div>
      </CardBody>
    </Card>
  );
}

// ----- Modal -----
export function Modal({
  open, onClose, title, children, footer, size = "md",
}: {
  open: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className={clsx("w-full bg-white rounded-xl shadow-lift overflow-hidden", sizes[size])} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

// ----- Toast -----
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lift flex items-center gap-3 animate-in slide-in-from-bottom-2">
      <span>✓</span>
      <span className="text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-75 hover:opacity-100">✕</button>
    </div>
  );
}

// ----- Empty state -----
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 text-center text-slate-500">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}

// ----- Section heading (public site) -----
export function SectionHeading({ eyebrow, title, lead, center = false }: { eyebrow?: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={clsx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <p className="text-sm font-semibold tracking-wide uppercase text-gold-600 mb-2">{eyebrow}</p>}
      <h2 className="text-3xl md:text-4xl font-bold text-brand-900 leading-tight">{title}</h2>
      {lead && <p className="mt-4 text-slate-600 text-lg">{lead}</p>}
    </div>
  );
}
