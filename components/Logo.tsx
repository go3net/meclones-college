"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { SCHOOL } from "@/lib/constants";

interface BrandSnapshot {
  logoUrl: string | null;
  logoSquareUrl: string | null;
}

// Module-level memo so multiple <Logo /> on the same page share one
// fetch across renders + navigations. A browser reload re-fetches
// (60s edge cache anyway).
let brandPromise: Promise<BrandSnapshot> | null = null;
function getBrandOnce(): Promise<BrandSnapshot> {
  if (!brandPromise) {
    brandPromise = fetch("/api/brand", { cache: "no-store" })
      .then(r => r.ok ? r.json() : { logoUrl: null, logoSquareUrl: null })
      .catch(() => ({ logoUrl: null, logoSquareUrl: null }));
  }
  return brandPromise;
}

/** First letter of the school's short name — used in the monogram fallback. */
const MONOGRAM = (SCHOOL.shortName.replace(/^the\s+/i, "").trim()[0] ?? "M").toUpperCase();

export function Logo({ variant = "dark", className }: { variant?: "dark" | "light"; className?: string }) {
  const [brand, setBrand] = useState<BrandSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    getBrandOnce().then(b => { if (!cancelled) setBrand(b); });
    return () => { cancelled = true; };
  }, []);

  const text = variant === "light" ? "text-white" : "text-brand-900";
  const sub = variant === "light" ? "text-gold-300" : "text-gold-600";

  const wideLogo = brand?.logoUrl;
  const squareLogo = brand?.logoSquareUrl ?? brand?.logoUrl;

  // When a wide logo is uploaded, render it on its own — the school's
  // own typography is part of the asset. Otherwise show the monogram
  // badge + name (uses the SCHOOL.shortName first letter so the
  // fallback matches whatever school is deployed).
  if (wideLogo) {
    return (
      <div className={clsx("flex items-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={wideLogo}
          alt={SCHOOL.name}
          className="h-10 w-auto max-w-[180px] object-contain"
        />
      </div>
    );
  }

  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div className="relative h-10 w-10 rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center shadow-md ring-2 ring-gold-400/30 shrink-0 overflow-hidden">
        {squareLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={squareLogo} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />
        ) : (
          <span className="text-gold-300 font-serif font-bold text-lg leading-none">{MONOGRAM}</span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-gold-400 ring-2 ring-white" />
      </div>
      <div className="leading-tight">
        <p className={clsx("font-serif font-bold text-lg tracking-tight", text)}>{SCHOOL.shortName}</p>
        <p className={clsx("text-[10px] font-semibold tracking-[0.14em] uppercase", sub)}>{SCHOOL.tagline}</p>
      </div>
    </div>
  );
}
