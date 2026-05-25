import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { saveNotificationPrefs } from "./actions";
import { PREF_KEYS, PREF_LABELS, canEmailFromRow } from "@/lib/notification-prefs";
import { ArrowLeft, CheckCircle2, Bell, Save, ShieldCheck } from "lucide-react";

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

export default async function NotificationPrefsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const prefs = await prisma.notificationPrefs.findUnique({ where: { userId: user.id } });
  const shellRole = SHELL_ROLE[user.role] ?? "parent";

  return (
    <PortalShell role={shellRole}>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/me" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 flex items-center gap-1">
            <Bell className="h-3.5 w-3.5" /> Settings
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Email notifications</h1>
          <p className="text-sm text-slate-500">
            Pick which emails you want from {process.env.NEXT_PUBLIC_SITE_URL ? "the school" : "us"}. In-portal bell alerts always show — these toggles only affect email.
          </p>
        </div>
      </div>

      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Preferences saved.
        </div>
      )}

      <form action={saveNotificationPrefs}>
        <Card className="mb-4">
          <CardHeader><CardTitle>Email me about…</CardTitle></CardHeader>
          <CardBody className="divide-y divide-slate-100 p-0">
            {PREF_KEYS.map(key => {
              const meta = PREF_LABELS[key];
              const checked = canEmailFromRow(prefs as Partial<Record<typeof key, boolean>> | null, key);
              return (
                <label key={key} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    name={key}
                    defaultChecked={checked}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-900">{meta.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.help}</p>
                  </div>
                </label>
              );
            })}
          </CardBody>
        </Card>

        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <CardTitle><ShieldCheck className="h-4 w-4 inline mr-1 text-amber-700" /> Always-on emails</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-700 mb-2">
              For safety and accountability, these emails always send and can't be turned off:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Password reset links</li>
              <li>Welcome / set-your-password emails</li>
              <li>Payment receipts</li>
              <li>The initial filing of a disciplinary case (resolutions are opt-out-able above)</li>
              <li>Admission application confirmations</li>
            </ul>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save preferences</Button>
        </div>
      </form>
    </PortalShell>
  );
}
