"use client";

import { useState } from "react";
import { Card, CardBody, Button, Input, Label, Textarea, Badge, Toast } from "@/components/ui";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { SCHOOL } from "@/lib/constants";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [toast, setToast] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("send failed");
      setToast("Message sent! We'll respond within 24 hours.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      setToast("Could not send message. Please try again or call us.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Toast message={toast} onClose={() => setToast("")} />
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Contact</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">We'd love to hear from you.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">Have a question? Need a campus tour? Want to apply? Reach us through any of the channels below.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="font-bold text-2xl text-brand-900">Send us a message</h2>
            <p className="mt-1 text-slate-600">We typically respond within one working day.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email *</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
              </div>
              <div><Label>Message *</Label><Textarea required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="min-h-[140px]" /></div>
              <Button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Message"}</Button>
            </form>
          </div>

          <aside className="space-y-4">
            <Card><CardBody>
              <h3 className="font-semibold text-brand-900 mb-3">Reach Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3"><MapPin className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" /><span className="text-slate-700">{SCHOOL.address}</span></li>
                <li className="flex gap-3"><Phone className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" /><a href={`tel:${SCHOOL.phoneIntl}`} className="text-slate-700 hover:text-brand-700">{SCHOOL.phone}</a></li>
                <li className="flex gap-3"><MessageCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" /><a href={`https://wa.me/${SCHOOL.whatsapp}`} target="_blank" rel="noreferrer noopener" className="text-slate-700 hover:text-emerald-700">WhatsApp: {SCHOOL.phone}</a></li>
                <li className="flex gap-3"><Mail className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" /><a href={`mailto:${SCHOOL.email}`} className="text-slate-700 hover:text-brand-700">{SCHOOL.email}</a></li>
                <li className="flex gap-3"><Clock className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" /><span className="text-slate-700">{SCHOOL.hours}</span></li>
              </ul>
            </CardBody></Card>
            <Card className="bg-gold-50 border-gold-200"><CardBody>
              <h3 className="font-semibold text-brand-900">Visit our campus</h3>
              <p className="text-sm text-slate-700 mt-2">Schedule a guided tour. We host visits on Tuesdays and Thursdays.</p>
              <a href="/book-visit"><Button variant="outline" className="mt-3 w-full">Book a Visit</Button></a>
            </CardBody></Card>
          </aside>
        </div>
      </section>
    </>
  );
}
