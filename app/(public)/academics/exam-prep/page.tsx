import { Badge, Card, CardBody, SectionHeading } from "@/components/ui";

export default function ExamPrepPage() {
  const programs = [
    { name: "WAEC / NECO", focus: "May/June and Nov/Dec sittings. Subject-specific intensive coaching from SS2.", level: "Local" },
    { name: "JAMB UTME", focus: "Saturday master classes, weekly mock tests, study analytics.", level: "Local" },
    { name: "Cambridge IGCSE", focus: "Subject teachers certified by Cambridge International. May/June series.", level: "International" },
    { name: "SAT", focus: "Verbal, math, and full-length proctored mocks. Bluebook digital readiness.", level: "International" },
    { name: "TOEFL / IELTS", focus: "Speaking labs, listening practice, writing workshops.", level: "International" },
  ];
  return (
    <>
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">National & International Exam Preparation</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Exam-ready scholars. World-ready graduates.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">Dedicated tracks for every major exam — taught by examiners and exam-trained subject specialists.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Programs" title="Five intensive exam-prep tracks." />
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {programs.map(p => (
              <Card key={p.name}>
                <CardBody>
                  <Badge tone={p.level === "Local" ? "info" : "gold"} className="mb-2">{p.level}</Badge>
                  <h3 className="text-lg font-bold text-brand-900">{p.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{p.focus}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Recent results" />
          <div className="mt-8 grid md:grid-cols-4 gap-4">
            {[["98%", "WAEC credits 2025"], ["8", "SAT scores ≥ 1400"], ["100%", "IGCSE pass rate"], ["12", "Cambridge A* awards"]].map(([v, l]) => (
              <Card key={l}><CardBody className="text-center"><p className="text-4xl font-bold text-brand-900">{v}</p><p className="text-sm text-slate-600 mt-1">{l}</p></CardBody></Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
