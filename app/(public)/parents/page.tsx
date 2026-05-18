import Link from "next/link";
import { Badge, Card, CardBody, Button, SectionHeading } from "@/components/ui";
import { Download, FileText, MessageCircle, CreditCard, BookOpen, Calendar } from "lucide-react";

export default function ParentsPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Parent Resources</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">Everything you need, in one place.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">Fees, calendar, uniform info, code of conduct, and the Meclones parent portal — all easily accessible.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: CreditCard, t: "Fee Schedule 2026/2027", d: "Tuition, books, boarding and optional levies for the new session.", btn: "Download PDF" },
            { icon: Calendar, t: "Academic Calendar", d: "Term dates, holidays, exam weeks, PTA meeting dates for the year.", btn: "View Calendar" },
            { icon: FileText, t: "Parent Handbook", d: "Code of conduct, uniform policy, attendance, pickup arrangements.", btn: "Download PDF" },
            { icon: BookOpen, t: "Book List", d: "Class-by-class textbook and stationery list for the term.", btn: "View List" },
            { icon: MessageCircle, t: "Contact Form Teacher", d: "Reach your child's form teacher directly through the portal.", btn: "Open Portal", href: "/portal/login" },
            { icon: Download, t: "Result Download", d: "Download official termly results and progress reports.", btn: "Open Portal", href: "/portal/login" },
          ].map(r => (
            <Card key={r.t} className="hover:shadow-lift transition-shadow">
              <CardBody>
                <div className="h-11 w-11 rounded-lg bg-brand-100 flex items-center justify-center mb-3"><r.icon className="h-5 w-5 text-brand-700" /></div>
                <h3 className="font-semibold text-brand-900">{r.t}</h3>
                <p className="mt-2 text-sm text-slate-600">{r.d}</p>
                {r.href ? (
                  <Link href={r.href}><Button variant="outline" className="mt-4 w-full">{r.btn}</Button></Link>
                ) : (
                  <Button variant="outline" className="mt-4 w-full">{r.btn}</Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionHeading title="The Meclones Parent Portal" center />
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">Access your child's attendance, results, fee balance, assignments, and direct messaging with teachers — anywhere, any time.</p>
          <div className="mt-8"><Link href="/portal/login"><Button variant="gold" className="px-6 py-3">Login to Portal</Button></Link></div>
        </div>
      </section>
    </>
  );
}
