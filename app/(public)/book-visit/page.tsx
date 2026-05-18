"use client";

import { useState } from "react";
import { Card, CardBody, Button, Input, Label, Select, Textarea, Badge, Toast } from "@/components/ui";
import { pushWhatsApp } from "@/lib/store";
import { CalendarCheck, MessageCircle } from "lucide-react";

export default function BookVisitPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", date: "", time: "10:00", classInterest: "", message: "" });
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    pushWhatsApp({
      to: form.phone,
      recipientName: form.name,
      trigger: "Visit Booked",
      message: `Dear ${form.name}, your campus visit at Meclones College is confirmed for ${form.date} at ${form.time}. Address: 12 Admiralty Way, Lekki Phase 1. We look forward to hosting you.`,
    });
    setDone(true);
    setToast("Visit booked! WhatsApp confirmation sent.");
  };

  if (done) {
    return (
      <div className="min-h-[60vh] bg-slate-50 py-16">
        <div className="max-w-xl mx-auto px-4">
          <Card>
            <CardBody className="text-center py-10">
              <CalendarCheck className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-brand-900">Visit booked!</h1>
              <p className="mt-2 text-slate-600">We've confirmed your visit for <strong>{form.date} at {form.time}</strong>.</p>
              <p className="mt-3 text-sm text-slate-500"><MessageCircle className="h-4 w-4 inline mr-1 text-emerald-600" />WhatsApp confirmation sent to {form.phone}.</p>
              <a href="/"><Button variant="outline" className="mt-6">Back to Home</Button></a>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toast message={toast} onClose={() => setToast("")} />
      <section className="bg-brand-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Badge tone="gold" className="mb-3">Book a Visit</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">See Meclones for yourself.</h1>
          <p className="mt-4 text-slate-300 max-w-2xl text-lg">Schedule a guided tour and meet our principal, teachers, and current students.</p>
        </div>
      </section>

      <section className="section">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardBody>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Full Name *</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Phone (WhatsApp) *</Label><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+234 ..." /></div>
                  <div className="sm:col-span-2"><Label>Email *</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Preferred Date *</Label><Input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Preferred Time *</Label>
                    <Select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                      <option>09:00</option><option>10:00</option><option>11:00</option><option>13:00</option><option>14:00</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>Class of Interest</Label>
                    <Select value={form.classInterest} onChange={e => setForm({ ...form, classInterest: e.target.value })}>
                      <option value="">Select</option>
                      <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                      <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-2"><Label>Anything specific you'd like to see?</Label><Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
                </div>
                <Button type="submit" variant="gold" className="w-full">Book Visit</Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </section>
    </>
  );
}
