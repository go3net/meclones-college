import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { startTotpEnrolment, confirmTotpEnrolment, disableTotp, cancelTotpEnrolment, regenerateCodes } from "./actions";
import { totpQrDataUrl, unusedRecoveryCodeCount } from "@/lib/totp";
import { ArrowLeft, Shield, CheckCircle2, AlertCircle, ShieldCheck, ShieldOff, KeyRound, X, LifeBuoy, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

const SHELL_ROLE: Record<string, "director" | "school_admin" | "accountant" | "teacher" | "parent" | "student"> = {
  SUPER_ADMIN: "director",
  DIRECTOR: "director",
  ADMIN: "school_admin",
  ACCOUNTANT: "accountant",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};

type SearchParams = { step?: string; saved?: string; error?: string; codes?: string };

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export default async function SecurityPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, totpSecret: true, totpEnabledAt: true },
  });
  if (!dbUser) redirect("/portal/login");

  const enabled = Boolean(dbUser.totpEnabledAt);
  const enrolling = !enabled && Boolean(dbUser.totpSecret) && searchParams.step === "verify";

  // Pre-render the QR data URL when we're showing the verify step.
  const qrDataUrl = enrolling && dbUser.totpSecret
    ? await totpQrDataUrl(dbUser.totpSecret, dbUser.email)
    : null;

  // Pull recovery-code state. The "show once" cookie is set by enrolment +
  // regenerate flows; reading it here clears it so refresh doesn't keep
  // showing the same codes.
  const cookieStore = cookies();
  const freshCookie = cookieStore.get("2fa_codes_once");
  let freshCodes: string[] | null = null;
  if (freshCookie && searchParams.codes === "fresh") {
    try {
      freshCodes = JSON.parse(freshCookie.value);
    } catch {
      freshCodes = null;
    }
    cookieStore.delete({ name: "2fa_codes_once", path: "/portal/me/security" });
  }
  const remainingCodes = enabled ? await unusedRecoveryCodeCount(user.id) : 0;

  const shellRole = SHELL_ROLE[user.role] ?? "parent";

  return (
    <PortalShell role={shellRole}>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/me" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> Security
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Two-factor authentication</h1>
          <p className="text-sm text-slate-500">
            Add a second step to every login — a 6-digit code from an authenticator app on your phone.
          </p>
        </div>
      </div>

      {searchParams.saved === "1" && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Two-factor authentication enabled. You'll be asked for a code at every future login.
        </div>
      )}
      {searchParams.saved === "off" && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <ShieldOff className="h-4 w-4" /> Two-factor authentication has been disabled.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {freshCodes && freshCodes.length > 0 && (
        <Card className="mb-6 border-amber-300">
          <CardHeader>
            <CardTitle><LifeBuoy className="h-4 w-4 inline mr-1 text-amber-600" /> Your recovery codes</CardTitle>
            <Badge tone="warning">Shown once</Badge>
          </CardHeader>
          <CardBody>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-900 mb-4">
              <strong>Save these now.</strong> They won't be shown again. Each code works exactly once and lets you sign in if you lose access to your authenticator app. Print them, paste them into a password manager, or save them somewhere safe.
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {freshCodes.map((c, idx) => (
                <code key={idx} className="font-mono text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-center tracking-wider text-slate-800">
                  {c}
                </code>
              ))}
            </div>

            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer hover:text-slate-900">Printable copy / download</summary>
              <pre className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-[11px] font-mono whitespace-pre">
{`Meclones College Lekki — Two-Factor Recovery Codes
Account: ${dbUser.email}
Generated: ${new Date().toISOString()}

${freshCodes.map((c, i) => `${(i + 1).toString().padStart(2)}.  ${c}`).join("\n")}

Each code can be used exactly once to sign in if your authenticator
app is unavailable. Keep this paper somewhere safe.`}
              </pre>
            </details>
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {enabled
              ? <><ShieldCheck className="h-4 w-4 inline mr-1 text-emerald-600" /> 2FA is on</>
              : <><Shield className="h-4 w-4 inline mr-1" /> 2FA is off</>}
          </CardTitle>
          <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
        </CardHeader>
        <CardBody>
          {enabled ? (
            <div className="space-y-4 text-sm text-slate-700">
              <p>
                Enabled on <strong>{dateTimeFmt.format(dbUser.totpEnabledAt!)}</strong>.
                You'll be asked for a 6-digit code from your authenticator app every time you sign in.
              </p>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    <LifeBuoy className="h-3.5 w-3.5 inline mr-1 text-amber-600" />
                    Recovery codes: <strong className={remainingCodes <= 2 ? "text-rose-700" : "text-slate-900"}>{remainingCodes} of 10 left</strong>
                  </span>
                  {remainingCodes <= 2 && (
                    <span className="text-rose-700 font-medium">Low — regenerate soon.</span>
                  )}
                </p>
              </div>

              <details className="rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-900">Regenerate recovery codes</summary>
                <form action={regenerateCodes} className="space-y-3 mt-3 max-w-sm">
                  <p className="text-xs text-slate-500">
                    Replaces your existing codes with a fresh batch of 10. Any unused old codes will stop working. Use this if you think your codes were lost or seen.
                  </p>
                  <div>
                    <Label>Enter your password to regenerate</Label>
                    <Input name="password" type="password" required minLength={1} placeholder="Current password" />
                  </div>
                  <Button type="submit" variant="outline"><KeyRound className="h-4 w-4" /> Generate new codes</Button>
                </form>
              </details>

              <form action={disableTotp} className="space-y-3 max-w-sm pt-2 border-t border-slate-100">
                <div>
                  <Label>Enter your password to disable 2FA</Label>
                  <Input name="password" type="password" required minLength={1} placeholder="Current password" />
                </div>
                <Button type="submit" variant="outline"><ShieldOff className="h-4 w-4" /> Disable 2FA</Button>
              </form>
            </div>
          ) : enrolling ? (
            <div className="space-y-4 text-sm">
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>Open your authenticator app (Google Authenticator, Authy, 1Password, etc.).</li>
                <li>Scan the QR code below — or paste the secret manually if you can't scan.</li>
                <li>Enter the 6-digit code your app shows to confirm everything works.</li>
              </ol>

              <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start pt-2">
                {qrDataUrl && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-white inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Authenticator QR code" width={220} height={220} />
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Secret (if you can't scan)</p>
                    <code className="block w-full font-mono text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 break-all">
                      {dbUser.totpSecret}
                    </code>
                  </div>
                  <form action={confirmTotpEnrolment} className="space-y-2">
                    <div>
                      <Label>Verify with a 6-digit code</Label>
                      <Input
                        name="code"
                        required
                        minLength={6}
                        maxLength={6}
                        pattern="[0-9]{6}"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        className="font-mono text-lg tracking-widest"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" variant="gold"><ShieldCheck className="h-4 w-4" /> Confirm & enable</Button>
                      <form action={cancelTotpEnrolment}>
                        <Button type="submit" variant="outline"><X className="h-4 w-4" /> Cancel</Button>
                      </form>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm text-slate-700">
              <p>
                Once enabled, every login on the portal will require both your password
                <strong> and</strong> a 6-digit code from your authenticator app.
                Strongly recommended for admin, director and accountant accounts.
              </p>
              <ul className="text-xs text-slate-500 list-disc list-inside">
                <li>You'll need a free authenticator app on your phone (Google Authenticator, Authy, Microsoft Authenticator, 1Password).</li>
                <li>Losing your phone or app data means you'll need an admin to reset 2FA on your behalf via the audit-log flow.</li>
              </ul>
              <form action={startTotpEnrolment}>
                <Button type="submit" variant="gold"><KeyRound className="h-4 w-4" /> Start enrolment</Button>
              </form>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
