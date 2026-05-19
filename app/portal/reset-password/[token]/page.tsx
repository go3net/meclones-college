import Link from "next/link";
import { Card, CardBody, Button, Input, Label } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { AlertCircle, KeyRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-reset";
import { resetPasswordWithToken } from "./actions";

type Props = { params: { token: string }; searchParams: { error?: string } };

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  // Pre-validate so we can show a nicer "link expired" page instead of failing
  // only when the user clicks submit.
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(params.token) },
  });
  const isValid = !!row && !row.usedAt && row.expiresAt > new Date();

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
            {!isValid ? (
              <div className="text-center py-6">
                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-brand-900">Link expired or invalid</h1>
                <p className="mt-2 text-sm text-slate-600">Password reset links are one-time and expire after 1 hour.</p>
                <Link href="/portal/forgot"><Button className="mt-6 w-full">Request a new link</Button></Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-gold-500" />
                  <h1 className="text-2xl font-bold text-brand-900">Set a new password</h1>
                </div>
                <p className="mt-1 text-sm text-slate-600">Choose a password at least 8 characters long. You'll be signed in afterwards.</p>

                {searchParams.error && (
                  <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" /> {decodeURIComponent(searchParams.error)}
                  </div>
                )}

                <form action={resetPasswordWithToken} className="mt-6 space-y-4">
                  <input type="hidden" name="token" value={params.token} />
                  <div>
                    <Label>New password</Label>
                    <Input type="password" name="password" required minLength={8} autoComplete="new-password" />
                  </div>
                  <div>
                    <Label>Confirm new password</Label>
                    <Input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
                  </div>
                  <Button type="submit" variant="gold" className="w-full">Reset password</Button>
                </form>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
