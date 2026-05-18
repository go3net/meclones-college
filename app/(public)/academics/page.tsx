import Link from "next/link";
import { Card, CardBody, SectionHeading, Badge, Button } from "@/components/ui";
import { BookOpen, GraduationCap, Trophy, ChevronRight } from "lucide-react";

export default function AcademicsPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Academics</Badge>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">A curriculum that prepares scholars for any future.</h1>
          <p className="mt-5 text-slate-300 max-w-2xl text-lg">Rooted in the Nigerian curriculum. Strengthened with Cambridge methods. Stretched by global exam preparation.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: BookOpen, title: "Junior Secondary", tag: "JSS 1 – 3", desc: "Core foundation. Critical thinking. Character. Exploration of arts, sciences, and technology.", href: "/academics/jss" },
            { icon: GraduationCap, title: "Senior Secondary", tag: "SS 1 – 3", desc: "Three streams: Sciences, Commercial, Arts. All aligned to WAEC and Cambridge standards.", href: "/academics/sss" },
            { icon: Trophy, title: "Exam Preparation", tag: "WAEC · IGCSE · SAT", desc: "Dedicated tracks for WAEC, JAMB, IGCSE, SAT, and TOEFL. Mock exams every term.", href: "/academics/exam-prep" },
          ].map(p => (
            <Card key={p.title} className="hover:shadow-lift transition-shadow">
              <CardBody>
                <div className="h-12 w-12 rounded-lg bg-brand-100 flex items-center justify-center mb-4"><p.icon className="h-6 w-6 text-brand-700" /></div>
                <Badge tone="gold" className="mb-2">{p.tag}</Badge>
                <h3 className="text-xl font-semibold text-brand-900">{p.title}</h3>
                <p className="mt-2 text-slate-600">{p.desc}</p>
                <Link href={p.href} className="mt-4 inline-flex items-center gap-1 text-brand-700 font-medium hover:gap-2 transition-all">View Program <ChevronRight className="h-4 w-4" /></Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Beyond the classroom" title="Co-curricular & enrichment." />
          <div className="mt-10 grid md:grid-cols-4 gap-4">
            {["Debate Club", "Robotics & Coding", "Drama Society", "Maths Olympiad", "Music & Choir", "Press Club", "Entrepreneurship", "Inter-house Sports"].map(c => (
              <Card key={c}><CardBody className="text-center"><p className="font-medium text-brand-900">{c}</p></CardBody></Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/apply"><Button variant="gold">Apply for Admission</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
