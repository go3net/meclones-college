import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

export default function SSSPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Senior Secondary School</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Preparing scholars for university and beyond.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">SS 1 to SS 3. Ages 14–17. Three streams. One standard: excellence.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Three streams" title="Choose the path that fits your child's future." center />
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { name: "Sciences", subjects: ["Mathematics", "English", "Biology", "Chemistry", "Physics", "Further Maths (optional)", "Civic Education", "Computer Studies"] },
              { name: "Commercial", subjects: ["Mathematics", "English", "Economics", "Accounting", "Commerce", "Government", "Civic Education", "Computer Studies"] },
              { name: "Arts", subjects: ["Mathematics", "English", "Literature in English", "Government", "History", "CRS / IRS", "Civic Education", "Yoruba / French"] },
            ].map(s => (
              <Card key={s.name}>
                <CardBody>
                  <h3 className="text-xl font-bold text-brand-900">{s.name}</h3>
                  <ul className="mt-4 space-y-2 text-sm">
                    {s.subjects.map(sub => (
                      <li key={sub} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /><span>{sub}</span></li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Outcomes" title="Where Meclones SS3 graduates go." />
          <div className="mt-8 grid md:grid-cols-4 gap-4">
            {[
              ["98%", "WAEC pass rate"],
              ["85%", "Top-3 SAT in Lagos"],
              ["70%", "Scholarship offers"],
              ["100%", "University admission"],
            ].map(([v, l]) => (
              <Card key={l}><CardBody className="text-center"><p className="text-4xl font-bold text-brand-900">{v}</p><p className="text-sm text-slate-600 mt-1">{l}</p></CardBody></Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
