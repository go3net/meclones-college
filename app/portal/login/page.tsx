"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { login, demoAccounts, dashboardPath } from "@/lib/auth";
import { ShieldCheck, AlertCircle, ArrowRight } from "lucide-react";

const roleLabel: Record<string, string> = {
  director: "Director / Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  accountant: "Accountant",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const user = login(email, password);
      if (!user) {
        setError("Invalid email or password. Try a demo account below.");
        setLoading(false);
        return;
      }
      router.push(dashboardPath(user.role));
    }, 400);
  };

  const useDemo = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-brand-700">← Back to website</Link>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-2">
        <div className="hidden lg:flex bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white p-12 items-center">
          <div className="max-w-md">
            <ShieldCheck className="h-12 w-12 text-gold-300 mb-4" />
            <h1 className="text-3xl font-bold leading-tight">Welcome to the Meclones Smart Portal.</h1>
            <p className="mt-4 text-slate-200 leading-relaxed">A single, secure place for parents, students, teachers, and administrators to manage academic life — from attendance to fees, results to assignments.</p>
            <div className="mt-8 space-y-2 text-sm text-slate-300">
              <p className="flex gap-2"><span className="text-gold-300">✓</span> AI-powered school insights</p>
              <p className="flex gap-2"><span className="text-gold-300">✓</span> Real-time WhatsApp notifications</p>
              <p className="flex gap-2"><span className="text-gold-300">✓</span> Secure Paystack-integrated payments</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-brand-900">Sign in to your portal</h2>
            <p className="mt-1 text-sm text-slate-600">Use any demo account below to explore each role.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@meclones.edu.ng" required /></div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <Label className="mb-0">Password</Label>
                  <Link href="/portal/forgot" className="text-xs text-brand-700 hover:underline">Forgot password?</Link>
                </div>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              {error && <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" /></Button>
            </form>

            <div className="mt-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo Accounts · Click to autofill</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts().map(a => (
                  <button key={a.email} type="button" onClick={() => useDemo(a.email, a.password)} className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors">
                    <p className="text-xs font-semibold text-brand-900">{roleLabel[a.role]}</p>
                    <p className="text-[11px] text-slate-500 truncate">{a.email}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">All demo passwords: <code className="bg-slate-100 px-1 rounded">demo1234</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
