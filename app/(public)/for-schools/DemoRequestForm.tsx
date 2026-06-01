"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Send } from "lucide-react";

export function DemoRequestForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const fd = new FormData(e.currentTarget);
    const schoolName = String(fd.get("schoolName") ?? "").trim();
    const studentCount = String(fd.get("studentCount") ?? "").trim();
    const branchCount = String(fd.get("branchCount") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();

    // Combine the school-specific fields into the message body so
    // we can reuse the existing /api/contact endpoint without
    // schema changes.
    const fullMessage = [
      `School: ${schoolName}`,
      `Estimated student count: ${studentCount || "—"}`,
      `Number of campuses: ${branchCount || "1"}`,
      "",
      message || "(no extra notes)",
    ].join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") ?? "").trim(),
          email: String(fd.get("email") ?? "").trim(),
          phone: String(fd.get("phone") ?? "").trim(),
          role: "Prospective school operator",
          subject: `Portal demo request — ${schoolName || "school"}`,
          message: fullMessage,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const issue = errBody?.issues?.fieldErrors
          ? Object.values(errBody.issues.fieldErrors).flat().join(", ")
          : errBody?.error ?? "Submission failed";
        throw new Error(String(issue));
      }
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Submission failed");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-white text-slate-900 rounded-2xl p-8 text-center">
        <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
        <h3 className="font-display text-2xl font-bold text-brand-900 mb-2">Thanks — we'll be in touch</h3>
        <p className="text-slate-600">
          We've got your details. Expect a call or email within 24 hours to schedule a walkthrough.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-medium text-brand-700 hover:underline"
        >
          Submit another request →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 grid sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Your name *</label>
        <input
          name="name"
          required
          minLength={2}
          placeholder="e.g. Mr. Tunde Williams"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Email *</label>
        <input
          name="email"
          type="email"
          required
          placeholder="you@yourschool.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Phone / WhatsApp *</label>
        <input
          name="phone"
          required
          placeholder="+234 803 000 0000"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">School name *</label>
        <input
          name="schoolName"
          required
          placeholder="e.g. Greensprings School Lekki"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Approx. number of students</label>
        <select name="studentCount" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
          <option value="">Pick one…</option>
          <option value="< 100">Under 100</option>
          <option value="100–300">100 – 300</option>
          <option value="300–600">300 – 600</option>
          <option value="600–1,000">600 – 1,000</option>
          <option value="1,000+">1,000+</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Number of campuses / branches</label>
        <select name="branchCount" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
          <option value="1">Just one</option>
          <option value="2">2 campuses</option>
          <option value="3">3 campuses</option>
          <option value="4">4 campuses</option>
          <option value="5+">5 or more</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5">Anything else we should know?</label>
        <textarea
          name="message"
          rows={3}
          placeholder="What you're currently using, what's not working, what you'd like the demo to focus on…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      {status === "error" && (
        <div className="sm:col-span-2 flex gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{errorMsg || "Something went wrong. Try again or call us directly."}</span>
        </div>
      )}

      <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap pt-2">
        <p className="text-xs text-slate-500">
          We'll never share your contact info. Reply to the email if you change your mind.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-brand-900 font-semibold px-6 py-3 rounded-lg text-sm"
        >
          {status === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {status === "submitting" ? "Sending…" : "Request a demo"}
        </button>
      </div>
    </form>
  );
}
