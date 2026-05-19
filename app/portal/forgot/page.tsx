import Link from "next/link";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { requestPasswordReset } from "./actions";
import { SCHOOL } from "@/lib/constants";

type SearchParams = { sent?: string; error?: string };

export default function ForgotPage({ searchParams }: { searchParams: SearchParams }) {
  const sent = !!searchParams.sent;

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
            {sent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-brand-900">Check your inbox</h1>
                <p className="mt-2 text-sm text-slate-600">If we found a matching account, we've sent a password reset link. It expires in <strong>1 hour</strong>.</p>
                <p className="mt-2 text-xs text-slate-500">Didn't get it? Check your spam folder, or contact the school office.</p>
                <Link href="/portal/login"><Button variant="outline" className="mt-6">Back to login</Button></Link>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-brand-900">Forgot password?</h1>
                <p className="mt-1 text-sm text-slate-600">Enter your email and we'll send you a reset link.</p>

                {searchParams.error && (
                  <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" /> {decodeURIComponent(searchParams.error)}
                  </div>
                )}

                <form action={requestPasswordReset} className="mt-6 space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" name="email" required autoComplete="email" placeholder="you@meclonescollege.com" />
                  </div>
                  <Button type="submit" className="w-full">Send reset link</Button>
                </form>

                <p className="text-[11px] text-slate-400 mt-4 text-center">
                  Need help? Call {SCHOOL.phone}
                </p>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
