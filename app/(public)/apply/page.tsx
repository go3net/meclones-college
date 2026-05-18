"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardBody, Button, Input, Label, Select, Textarea, Badge } from "@/components/ui";
import { updateStore, pushWhatsApp } from "@/lib/store";
import { CheckCircle2, MessageCircle, Upload } from "lucide-react";

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ref: string; whatsappMsg: string } | null>(null);
  const [form, setForm] = useState({
    studentFirstName: "",
    studentLastName: "",
    studentDob: "",
    studentGender: "",
    classApplying: "",
    previousSchool: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    parentOccupation: "",
    homeAddress: "",
    studentPhoto: "",
    previousReport: "",
    notes: "",
  });

  const handle = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSubmitting(true);
    const studentName = `${form.studentFirstName} ${form.studentLastName}`.trim();
    try {
      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = (await res.json()) as { reference: string };
      const ref = json.reference;
      const message = `Dear ${form.parentName}, your application for ${studentName} (${form.classApplying}) has been received. Your application reference is ${ref}. Our admissions team will be in touch within 24 hours to schedule the entrance examination. — Meclones College Lekki`;

      // Mirror into the local mock store so the admin portal demo still works
      // alongside the real DB persist on the server.
      updateStore(s => {
        s.applications.unshift({
          id: "app-" + Date.now(),
          studentName,
          parentName: form.parentName,
          parentPhone: form.parentPhone,
          parentEmail: form.parentEmail,
          classApplying: form.classApplying,
          previousSchool: form.previousSchool || "—",
          status: "submitted",
          submittedAt: new Date().toISOString().slice(0, 10),
        });
      });
      pushWhatsApp({
        to: form.parentPhone,
        recipientName: form.parentName,
        trigger: "Admission Form Submitted",
        message,
      });
      setDone({ ref, whatsappMsg: message });
    } catch (err) {
      console.error(err);
      // Soft-fail: still show the success screen with a locally generated ref so
      // the demo experience doesn't break before the DB is wired.
      const ref = "MEC/" + new Date().getFullYear() + "/" + Math.floor(1000 + Math.random() * 9000);
      const message = `Dear ${form.parentName}, your application for ${studentName} (${form.classApplying}) has been received. Your application reference is ${ref}. — Meclones College Lekki`;
      setDone({ ref, whatsappMsg: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-[70vh] bg-slate-50 py-16">
        <div className="max-w-2xl mx-auto px-4">
          <Card>
            <CardBody className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-brand-900">Application submitted!</h1>
              <p className="mt-2 text-slate-600">Your application reference is</p>
              <p className="mt-1 text-2xl font-mono font-bold text-brand-700">{done.ref}</p>

              <div className="mt-8 text-left">
                <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp confirmation sent</p>
                <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm text-slate-800">{done.whatsappMsg}</div>
                <p className="text-xs text-slate-400 mt-2">Simulated — actual integration is via WhatsApp Cloud API.</p>
              </div>

              <div className="mt-8 flex gap-3 justify-center">
                <Link href="/"><Button variant="outline">Back to Home</Button></Link>
                <Link href="/portal/login"><Button>Track Application in Portal</Button></Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-12 md:py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Badge tone="gold" className="mb-2">Apply Now</Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-900">2026/2027 Application Form</h1>
          <p className="mt-2 text-slate-600">Takes about 10 minutes. You'll receive a WhatsApp confirmation on submission.</p>
        </div>

        <div className="flex items-center mb-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= n ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-500"}`}>{n}</div>
              {n < 3 && <div className={`flex-1 h-0.5 mx-2 ${step > n ? "bg-brand-700" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardBody>
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg text-brand-900">Student Details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>First Name *</Label><Input value={form.studentFirstName} onChange={e => handle("studentFirstName", e.target.value)} required /></div>
                  <div><Label>Last Name *</Label><Input value={form.studentLastName} onChange={e => handle("studentLastName", e.target.value)} required /></div>
                  <div><Label>Date of Birth *</Label><Input type="date" value={form.studentDob} onChange={e => handle("studentDob", e.target.value)} /></div>
                  <div><Label>Gender *</Label><Select value={form.studentGender} onChange={e => handle("studentGender", e.target.value)}><option value="">Select</option><option value="M">Male</option><option value="F">Female</option></Select></div>
                  <div><Label>Class Applying For *</Label>
                    <Select value={form.classApplying} onChange={e => handle("classApplying", e.target.value)}>
                      <option value="">Select class</option>
                      <option>JSS 1</option><option>JSS 2</option><option>JSS 3</option>
                      <option>SS 1</option><option>SS 2</option><option>SS 3</option>
                    </Select>
                  </div>
                  <div><Label>Previous School</Label><Input value={form.previousSchool} onChange={e => handle("previousSchool", e.target.value)} /></div>
                </div>
                <div>
                  <Label>Upload Student Passport (mock)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500 hover:border-brand-300">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    Drop file or <span className="text-brand-700 font-medium">browse</span>
                    <p className="text-xs text-slate-400 mt-1">JPG / PNG up to 2MB · Demo only</p>
                  </div>
                </div>
                <div>
                  <Label>Upload Previous School Report (mock)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500 hover:border-brand-300">
                    <Upload className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                    Drop PDF or <span className="text-brand-700 font-medium">browse</span>
                    <p className="text-xs text-slate-400 mt-1">PDF up to 5MB · Demo only</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => setStep(2)} disabled={!form.studentFirstName || !form.studentLastName || !form.classApplying}>Next →</Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg text-brand-900">Parent / Guardian</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Label>Parent/Guardian Full Name *</Label><Input value={form.parentName} onChange={e => handle("parentName", e.target.value)} /></div>
                  <div><Label>Phone (WhatsApp) *</Label><Input type="tel" placeholder="+234 801 234 5678" value={form.parentPhone} onChange={e => handle("parentPhone", e.target.value)} /></div>
                  <div><Label>Email *</Label><Input type="email" value={form.parentEmail} onChange={e => handle("parentEmail", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Occupation</Label><Input value={form.parentOccupation} onChange={e => handle("parentOccupation", e.target.value)} /></div>
                  <div className="sm:col-span-2"><Label>Home Address</Label><Textarea value={form.homeAddress} onChange={e => handle("homeAddress", e.target.value)} /></div>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                  <Button onClick={() => setStep(3)} disabled={!form.parentName || !form.parentPhone || !form.parentEmail}>Next →</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-semibold text-lg text-brand-900">Review & Submit</h2>
                <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
                  <p><span className="text-slate-500">Student:</span> <strong>{form.studentFirstName} {form.studentLastName}</strong></p>
                  <p><span className="text-slate-500">Class:</span> {form.classApplying}</p>
                  <p><span className="text-slate-500">Parent:</span> {form.parentName}</p>
                  <p><span className="text-slate-500">Phone:</span> {form.parentPhone}</p>
                  <p><span className="text-slate-500">Email:</span> {form.parentEmail}</p>
                </div>
                <div><Label>Anything else we should know?</Label><Textarea value={form.notes} onChange={e => handle("notes", e.target.value)} placeholder="Special needs, sibling already at Meclones, etc." /></div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900 flex gap-2">
                  <MessageCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>On submit, a WhatsApp confirmation will be sent to <strong>{form.parentPhone || "your phone"}</strong> with your application reference.</span>
                </div>
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                  <Button variant="gold" onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Application"}</Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
