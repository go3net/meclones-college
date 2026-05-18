"use client";

import { SCHOOL } from "@/lib/constants";

export function WhatsAppFab() {
  const message = encodeURIComponent(
    `Hello ${SCHOOL.shortName}, I'd like to ask a few questions about your school.`
  );
  const href = `https://wa.me/${SCHOOL.whatsapp}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 group flex items-center gap-2"
    >
      <span className="hidden sm:inline-flex bg-white text-brand-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-card opacity-0 group-hover:opacity-100 transition-opacity">
        Chat on WhatsApp
      </span>
      <span className="relative h-14 w-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lift ring-4 ring-white hover:scale-105 transition-transform">
        {/* Pulsing halo */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
        {/* WhatsApp glyph */}
        <svg
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          className="relative h-7 w-7 text-white"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39-.272 0-.519-.085-1.013-.302-1.43-.628-3.097-2.187-3.913-3.482-.246-.396-.04-.617.171-.84.214-.226.435-.435.643-.681.231-.273.345-.41.547-.752.21-.36.105-.708-.105-.997-.214-.288-.95-2.296-1.3-3.124-.347-.825-.722-.722-.997-.722-.272 0-.582-.038-.892-.038s-.815.117-1.252.578c-.435.462-1.665 1.628-1.665 3.961 0 2.333 1.706 4.589 1.945 4.911.24.32 3.358 5.123 8.137 7.187 4.776 2.064 4.776 1.378 5.638 1.299.86-.08 2.78-1.137 3.176-2.234.39-1.098.39-2.04.275-2.234-.115-.197-.42-.314-.892-.547-.469-.231-2.787-1.36-3.224-1.515-.435-.156-.752-.234-1.066.234-.32.466-1.222 1.546-1.504 1.864-.272.313-.547.353-1.017.118zm-3.11 14.795c-2.842 0-5.504-.832-7.745-2.265L0 32l2.36-7.043C.797 22.587 0 19.866 0 16.95 0 7.583 7.583 0 16.95 0c4.524 0 8.78 1.762 11.978 4.956 3.198 3.196 4.96 7.452 4.96 11.978 0 9.367-7.59 16.95-16.95 16.95l-.987-.884z" />
        </svg>
      </span>
    </a>
  );
}
