"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ROLE_HOME } from "@/auth.config";
import { PLACE } from "@/lib/images";
import { ShieldCheck, AlertCircle, ArrowRight, Lock } from "lucide-react";

const DEMO_ACCOUNTS: { role: keyof typeof ROLE_HOME; email: string; label: string }[] = [
  { role: "DIRECTOR", email: "director@meclonescollege.com", label: "Director" },
  { role: "SUPER_ADMIN", email: "superadmin@meclonescollege.com", label: "Super Admin" },
  { role: "ADMIN", email: "admin@meclonescollege.com", label: "School Admin" },
  { role: "ACCOUNTANT", email: "accountant@meclonescollege.com", label: "Accountant" },
  { role: "TEACHER", email: "teacher@meclonescollege.com", label: "Teacher" },
  { role: "STUDENT", email: "student@meclonescollege.com", label: "Student" },
  { role: "PARENT", email: "parent@meclonescollege.com", label: "Parent" },
];

const DEMO_PASSWORD = "Meclones123!";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Pre-compute the redirect target so we can let NextAuth do the full
    // round-trip in one hop. /portal/me is a server-component forwarder that
    // reads the new session cookie and redirects to the role's home — we let
    // signIn's own redirect handle the navigation so the cookie is in place
    // before the destination page renders (avoids a flash of /portal/login).
    const target = callbackUrl ?? "/portal/me";

    const res = await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    if (!res || res.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // Hard navigation rather than router.push so middleware re-reads the
    // freshly-set cookie and there's no client-router stale state. Faster
    // perceived experience than push() + refresh().
    window.location.href = target;
  };

  const useDemo = (e: string) => {
    setEmail(e);
    setPassword(DEMO_PASSWORD);
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
        <div className="hidden lg:block relative text-white">
          {/* Full-height hero photo behind a navy gradient for legibility */}
          <Image
            src={PLACE.homeHero}
            alt="Meclones College students"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/95 via-brand-900/80 to-brand-800/40" />

          {/* Content: welcome copy at the top, security card at the bottom */}
          <div className="relative h-full flex flex-col justify-between p-12 z-10">
            <div className="max-w-md">
              <ShieldCheck className="h-12 w-12 text-gold-300 mb-4" />
              <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight">
                Welcome to the<br />Meclones <span className="text-gold-300">Portal</span>
              </h1>
              <div className="mt-4 h-1 w-16 bg-gold-400 rounded-full" />
              <p className="mt-5 text-slate-200 leading-relaxed">
                Your secure gateway to academic excellence. Access important information, manage activities and stay connected with the Meclones community.
              </p>
              <div className="mt-8 space-y-2 text-sm text-slate-200">
                <p className="flex gap-2"><span className="text-gold-300">✓</span> Real-time WhatsApp notifications</p>
                <p className="flex gap-2"><span className="text-gold-300">✓</span> Secure Paystack-integrated payments</p>
                <p className="flex gap-2"><span className="text-gold-300">✓</span> One dashboard for parents, students, staff</p>
              </div>
            </div>

            {/* Trust card — matches the brief mockup */}
            <div className="max-w-sm bg-white/10 backdrop-blur-md ring-1 ring-white/15 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-gold-400 text-brand-900 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Secure. Trusted. Meclones.</p>
                  <p className="text-xs text-slate-300 mt-0.5">Your data is protected with enterprise-grade security and privacy standards.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            <h2 className="text-2xl font-bold text-brand-900">Sign in to your portal</h2>
            <p className="mt-1 text-sm text-slate-600">Use any demo account below to explore each role.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label>Email or Admission Number</Label>
                <Input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@meclonescollege.com  or  MCL/SS3A/2526/001"
                  required
                  autoComplete="username"
                />
                <p className="text-[11px] text-slate-500 mt-1">Students may sign in with their admission number (e.g. MCL/SS3A/2526/001) instead of an email.</p>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <Label className="mb-0">Password</Label>
                  <Link href="/portal/forgot" className="text-xs text-brand-700 hover:underline">Forgot password?</Link>
                </div>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {error && <div className="flex gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span></div>}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"} <ArrowRight className="h-4 w-4" /></Button>
            </form>

            <div className="mt-8">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Demo Accounts · Click to autofill</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(a => (
                  <button key={a.email} type="button" onClick={() => useDemo(a.email)} className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors">
                    <p className="text-xs font-semibold text-brand-900">{a.label}</p>
                    <p className="text-[11px] text-slate-500 truncate">{a.email}</p>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">All demo passwords: <code className="bg-slate-100 px-1 rounded">{DEMO_PASSWORD}</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
