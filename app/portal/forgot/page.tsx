"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { CheckCircle2 } from "lucide-react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/portal/login" className="text-sm text-slate-600 hover:text-brand-700">← Back to login</Link>
        </div>
      </header>
      <div className="max-w-md mx-auto p-6 mt-8">
        <Card>
          <CardBody>
            {!sent ? (
              <>
                <h1 className="text-2xl font-bold text-brand-900">Forgot password?</h1>
                <p className="mt-1 text-sm text-slate-600">Enter your email and we'll send you a reset link.</p>
                <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="mt-6 space-y-4">
                  <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <Button type="submit" className="w-full">Send reset link</Button>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-brand-900">Check your inbox</h1>
                <p className="mt-2 text-sm text-slate-600">If <strong>{email}</strong> matches a Meclones account, we've sent a password reset link.</p>
                <Link href="/portal/login"><Button variant="outline" className="mt-6">Back to login</Button></Link>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
