import Image from "next/image";
import { Badge, Card, CardBody } from "@/components/ui";
import { PLACE } from "@/lib/images";

export default function NewsPage() {
  const items = [
    { tag: "Event", title: "Inter-house Sports 2026", date: "May 22, 2026", body: "All students compete in athletics, swimming, and team events across our four houses. Parents are warmly welcome.", img: PLACE.news.interhouse },
    { tag: "Achievement", title: "Mock WAEC: 100% credit pass in Mathematics", date: "May 8, 2026", body: "Every single SS3 student scored a credit or better in Mathematics in our final mock WAEC examinations.", img: PLACE.news.mockWAEC },
    { tag: "Notice", title: "PTA Meeting — May 30, 2026", date: "May 14, 2026", body: "The second-quarter PTA meeting will hold at 10:00am in the school hall. Agenda includes WAEC readiness and 2026/2027 calendar.", img: PLACE.news.ptaMeeting },
    { tag: "Event", title: "Career & College Day", date: "April 28, 2026", body: "Senior students engaged with admissions officers from 12 universities across Nigeria, UK, and North America.", img: PLACE.news.careerDay },
    { tag: "Achievement", title: "Cambridge Outstanding Learner Awards", date: "March 15, 2026", body: "Two of our SS3 students received Cambridge Top in Nigeria awards in Biology and Mathematics IGCSE.", img: PLACE.news.cambridgeAwards },
    { tag: "Notice", title: "School calendar 2026/2027 published", date: "March 1, 2026", body: "The full school calendar for the 2026/2027 session is now available in the parent portal.", img: PLACE.news.calendar },
  ];
  return (
    <>
      <section className="relative bg-brand-900 text-white py-16 overflow-hidden">
        <Image src={PLACE.aboutHero} alt="" fill priority sizes="100vw" className="object-cover -z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/95 via-brand-900/80 to-brand-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">News & Events</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">What's happening at Meclones.</h1>
        </div>
      </section>
      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(n => (
              <Card key={n.title} className="hover:shadow-lift transition-shadow overflow-hidden">
                <div className="relative h-44 bg-slate-100">
                  <Image src={n.img} alt={n.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                </div>
                <CardBody>
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone="info">{n.tag}</Badge>
                    <span className="text-xs text-slate-500">{n.date}</span>
                  </div>
                  <h3 className="font-semibold text-brand-900">{n.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{n.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
