import Link from "next/link";
import { Card, CardBody, Button, Badge, SectionHeading } from "@/components/ui";
import { CheckCircle2, FileText, Calendar, Award, MessageCircle } from "lucide-react";

export default function AdmissionPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Admissions</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Begin your child's Meclones journey.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">Applications for the 2026/2027 session are open. The process is digital, simple, and you'll hear from us on WhatsApp every step of the way.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply"><Button variant="gold" className="px-5 py-3">Start Application</Button></Link>
            <Link href="/book-visit"><Button variant="outline" className="px-5 py-3 bg-white/5 text-white border-white/30 hover:bg-white/10">Book a Campus Visit</Button></Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="The process" title="Four steps to admission." />
          <div className="mt-10 grid md:grid-cols-4 gap-6">
            {[
              { i: FileText, n: "01", t: "Submit Application", d: "Complete the online form. Upload passport photo and last school report." },
              { i: MessageCircle, n: "02", t: "WhatsApp Confirmation", d: "Receive instant confirmation and your application reference number." },
              { i: Calendar, n: "03", t: "Entrance Exam", d: "Sit the entrance examination on-campus or online. Subjects are age-appropriate." },
              { i: Award, n: "04", t: "Offer Letter", d: "Successful candidates receive an admission offer within 5 working days." },
            ].map(s => (
              <Card key={s.n}>
                <CardBody>
                  <div className="text-4xl font-bold text-gold-400/60">{s.n}</div>
                  <div className="mt-1 h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center"><s.i className="h-5 w-5 text-brand-700" /></div>
                  <h3 className="mt-3 font-semibold text-brand-900">{s.t}</h3>
                  <p className="mt-2 text-sm text-slate-600">{s.d}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10">
          <div>
            <SectionHeading title="Requirements & Documents" />
            <ul className="mt-6 space-y-3">
              {[
                "Completed online application form",
                "Recent passport photograph of the candidate",
                "Most recent school report card (or birth certificate for JSS 1)",
                "Birth certificate or sworn affidavit of age",
                "Parent / Guardian valid ID (NIN, passport, or driver's license)",
                "Non-refundable application fee: ₦15,000",
              ].map(r => (
                <li key={r} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /><span className="text-slate-700">{r}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading title="Key dates" />
            <Card className="mt-6">
              <CardBody>
                <dl className="space-y-3 text-sm">
                  {[
                    ["Application window opens", "March 1, 2026"],
                    ["Application deadline", "July 15, 2026"],
                    ["Entrance exam window", "April – July 2026"],
                    ["Offer letters released", "Rolling — within 5 days of exam"],
                    ["Resumption (new session)", "September 9, 2026"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-100 pb-2 last:border-0">
                      <dt className="text-slate-600">{k}</dt><dd className="font-medium text-brand-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
