import { Card, CardBody, SectionHeading, Badge } from "@/components/ui";
import { Target, Eye, Heart, Award, Users, ShieldCheck, GraduationCap } from "lucide-react";
import { SCHOOL, STATS } from "@/lib/constants";

export default function AboutPage() {
  return (
    <>
      <section className="bg-brand-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">About Us</Badge>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight max-w-3xl">A culture of excellence, anchored in character.</h1>
          <p className="mt-5 text-slate-300 max-w-2xl text-lg">For over {STATS.yearsExperience} years, {SCHOOL.name} has been a quiet force in Lagos secondary education — known for academic rigour, warm community, and graduates who carry themselves with grace.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, t: "Our Mission", d: "To provide world-class secondary education that nurtures intellectual curiosity, strong character, and a heart for service." },
            { icon: Eye, t: "Our Vision", d: "To be West Africa's most trusted private secondary school — where every graduate is ready for the world's best universities and the world's hardest problems." },
            { icon: Heart, t: "Our Values", d: "Excellence. Integrity. Service. Faith. Innovation. Community. These six anchor every classroom, every conversation, every decision." },
          ].map(b => (
            <Card key={b.t}>
              <CardBody>
                <div className="h-12 w-12 rounded-lg bg-gold-100 text-gold-700 flex items-center justify-center mb-4"><b.icon className="h-6 w-6" /></div>
                <h3 className="text-xl font-bold text-brand-900">{b.t}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">{b.d}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="section bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="History" title="From a small classroom to a beacon of education." />
          <div className="mt-10 grid md:grid-cols-2 gap-10">
            <div className="space-y-5 text-slate-700 leading-relaxed">
              <p>{SCHOOL.name} was founded with a singular conviction: that Nigerian children deserve a secondary education that can stand shoulder-to-shoulder with the world's best — without losing the warmth, values, and identity that make a Lagos upbringing special.</p>
              <p>What started as a single JSS classroom has grown over two decades into a full secondary school, a {STATS.teachers}-strong teaching faculty, and an alumni network of more than {STATS.alumni} graduates studying and working across Nigeria, the UK, the US, and Canada.</p>
              <p>We have grown — but the founding promise has not changed: <strong className="text-brand-900">know every child by name, stretch them to their potential, and send them into the world prepared.</strong></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { i: Award, n: `${STATS.yearsExperience}`, l: "Years of excellence" },
                { i: Users, n: `${STATS.alumni}`, l: "Alumni network" },
                { i: GraduationCap, n: `${STATS.teachers}`, l: "Teaching faculty" },
                { i: ShieldCheck, n: "6", l: "Major exams prepared" },
              ].map(s => (
                <Card key={s.l}>
                  <CardBody className="text-center">
                    <s.i className="h-8 w-8 mx-auto text-brand-700 mb-2" />
                    <p className="text-3xl font-bold text-brand-900">{s.n}</p>
                    <p className="text-sm text-slate-600 mt-1">{s.l}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Leadership" title="Meet the team behind Meclones." center />
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { name: "Mrs. Olufunke Adebayo", role: "Founder & Director", bio: "Former Federal Government College principal with 30+ years in secondary education." },
              { name: "Mr. Kelechi Nnamdi", role: "School Administrator", bio: "Leads day-to-day school operations, admissions, and parent relations." },
              { name: "Dr. Chioma Eze", role: "Head of Sciences", bio: "PhD in Biology, University of Ibadan. Champions our STEM and lab programs." },
            ].map(p => (
              <Card key={p.name}>
                <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                  <span className="text-6xl font-serif font-bold text-brand-700">{p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span>
                </div>
                <CardBody>
                  <h3 className="font-semibold text-brand-900">{p.name}</h3>
                  <p className="text-sm text-gold-700 font-medium">{p.role}</p>
                  <p className="mt-3 text-sm text-slate-600">{p.bio}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
