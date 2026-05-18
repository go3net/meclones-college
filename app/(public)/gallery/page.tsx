import Image from "next/image";
import { Badge } from "@/components/ui";
import { PLACE } from "@/lib/images";

export default function GalleryPage() {
  return (
    <>
      <section className="relative bg-brand-900 text-white py-16 overflow-hidden">
        <Image src={PLACE.gallery[6].src} alt="" fill priority sizes="100vw" className="object-cover -z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-900/80 to-brand-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Gallery</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">A glimpse into life at Meclones.</h1>
        </div>
      </section>
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLACE.gallery.map((i, idx) => (
              <div key={`${i.label}-${idx}`} className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
                <Image src={i.src} alt={i.label} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div>
                    <p className="text-xs text-gold-300 font-medium">{i.category}</p>
                    <p className="text-white font-semibold">{i.label}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-white/95 px-2 py-0.5 rounded text-xs font-medium text-brand-900">{i.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
