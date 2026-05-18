import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

export default function JSSPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Junior Secondary School</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Building the foundations of a strong scholar.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">JSS 1 to JSS 3. Ages 10–13. The years that shape the learner your child will become.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6 text-slate-700 leading-relaxed">
            <p>Our Junior Secondary program is built around the Nigerian Universal Basic Education curriculum, strengthened with Cambridge-inspired approaches to critical thinking, reading, and problem-solving.</p>
            <p>Class sizes are kept small (max 25 students per class) so every child is known by name and stretched at their own pace. Form teachers meet with each parent termly to discuss progress.</p>
            <SectionHeading title="What students study" />
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {[
                "English Language & Literature",
                "Mathematics",
                "Basic Science & Technology",
                "Social Studies",
                "Civic Education",
                "Computer Studies & Coding",
                "Christian Religious Studies",
                "French / Yoruba",
                "Business Studies",
                "Cultural & Creative Arts",
                "Physical & Health Education",
                "Agriculture",
              ].map(s => (
                <div key={s} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /><span>{s}</span></div>
              ))}
            </div>
          </div>
          <aside className="space-y-4">
            <Card>
              <CardBody>
                <h3 className="font-semibold text-brand-900">At a glance</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Ages</dt><dd className="font-medium">10 – 13</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Class size</dt><dd className="font-medium">Max 25</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Duration</dt><dd className="font-medium">3 years</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Terminal exam</dt><dd className="font-medium">BECE</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Tuition / term</dt><dd className="font-medium">₦350,000</dd></div>
                </dl>
              </CardBody>
            </Card>
            <Card className="bg-gold-50 border-gold-200">
              <CardBody>
                <h3 className="font-semibold text-brand-900">Boarding available</h3>
                <p className="text-sm text-slate-700 mt-2">Optional weekly and full boarding for JSS 1–3.</p>
              </CardBody>
            </Card>
          </aside>
        </div>
      </section>
    </>
  );
}
