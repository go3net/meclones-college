import { Badge, SectionHeading } from "@/components/ui";
import { Image as ImageIcon } from "lucide-react";

export default function GalleryPage() {
  const items = [
    { title: "Inter-house Sports 2025", category: "Sports", color: "from-emerald-500 to-emerald-700" },
    { title: "Cultural Day", category: "Events", color: "from-amber-500 to-amber-700" },
    { title: "Science Fair", category: "Academics", color: "from-sky-500 to-sky-700" },
    { title: "Founder's Day Lecture", category: "Events", color: "from-brand-500 to-brand-700" },
    { title: "STEM & Robotics Lab", category: "Facilities", color: "from-purple-500 to-purple-700" },
    { title: "Debate Finals", category: "Co-curricular", color: "from-rose-500 to-rose-700" },
    { title: "Graduation 2025", category: "Events", color: "from-gold-500 to-gold-700" },
    { title: "Library Reading Hour", category: "Facilities", color: "from-teal-500 to-teal-700" },
    { title: "WAEC Mock Awards", category: "Academics", color: "from-indigo-500 to-indigo-700" },
  ];
  return (
    <>
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Gallery</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">A glimpse into life at Meclones.</h1>
        </div>
      </section>
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(i => (
              <div key={i.title} className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer">
                <div className={`absolute inset-0 bg-gradient-to-br ${i.color} flex items-center justify-center`}>
                  <ImageIcon className="h-16 w-16 text-white/40" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div>
                    <p className="text-xs text-gold-300 font-medium">{i.category}</p>
                    <p className="text-white font-semibold">{i.title}</p>
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 px-2 py-0.5 rounded text-xs font-medium">{i.category}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-8">Placeholder visuals — replace with school photos in production.</p>
        </div>
      </section>
    </>
  );
}
