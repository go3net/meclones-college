import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Textarea, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { logWhatsAppOutgoing } from "./actions";
import { ArrowLeft, MessageCircle, Send, CheckCircle2, AlertCircle, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

type Props = { params: { id: string }; searchParams: { sent?: string; error?: string } };

const QUICK_TEMPLATES = [
  { name: "Fee reminder", body: "Dear parent, this is a friendly reminder that {child}'s school fees have an outstanding balance. Kindly settle at your earliest convenience. Thank you. — Meclones College Lekki" },
  { name: "Result published", body: "Dear parent, {child}'s term results have been published on the portal. Please log in to view and discuss with your ward. — Meclones College Lekki" },
  { name: "Attendance alert", body: "Dear parent, we noticed {child} was absent / late today. Kindly ensure attendance and punctuality. Contact the school if there are concerns. — Meclones College Lekki" },
  { name: "PTA meeting", body: "Dear parent, please be reminded of the Parent-Teacher Association meeting on [DATE] at 10:00am in the school hall. Your attendance is highly valued. — Meclones College Lekki" },
];

export default async function ParentWhatsAppPage({ params, searchParams }: Props) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const parent = await prisma.parent.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      children: { include: { student: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!parent) notFound();

  const phoneNumber = parent.user.phone?.replace(/\D/g, "") ?? "";

  // Pull previous outbound history (if any session exists for this phone).
  const history = phoneNumber
    ? await prisma.whatsAppMessage.findMany({
        where: { session: { phoneNumber } },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    : [];

  const childName = parent.children[0]?.student.user.name ?? "your child";

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/parents" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Message {parent.user.name}</h1>
          <p className="text-sm text-slate-500">
            {parent.user.phone ? <span><Phone className="h-3 w-3 inline mr-0.5" /> {parent.user.phone}</span> : "No phone on file"}
            {parent.children.length > 0 && <> · Children: {parent.children.map(c => c.student.user.name).join(", ")}</>}
          </p>
        </div>
      </div>

      {searchParams.sent && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Message logged. The WhatsApp window should have opened; if not, copy the message and paste into WhatsApp manually.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      {!parent.user.phone && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-900">
          This parent has no phone number recorded. Add one via the parent's <Link href={`/portal/admin/parents/${parent.id}/edit`} className="font-semibold underline">Edit profile</Link> page before sending WhatsApp messages.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle><MessageCircle className="h-4 w-4 inline mr-1" /> Compose message</CardTitle></CardHeader>
            <CardBody>
              <form action={logWhatsAppOutgoing} className="space-y-3" target="_blank">
                <input type="hidden" name="parentId" value={parent.id} />
                <div>
                  <Label>Message *</Label>
                  <Textarea name="message" required minLength={2} rows={6} defaultValue={`Dear ${parent.user.name},\n\n\n\n— Meclones College Lekki`} />
                  <p className="text-[11px] text-slate-500 mt-1">
                    On send, we'll log the message for audit + open WhatsApp Web/app with the text pre-filled. You'll review and hit send in WhatsApp itself.
                  </p>
                </div>
                <div className="flex justify-end">
                  {parent.user.phone ? (
                    <a
                      // Opens WhatsApp deep-link AND logs at the same time by hitting the action endpoint.
                      // Note: the form posts to logWhatsAppOutgoing, which redirects with `?sent=1`. The button below opens wa.me in a new tab in parallel.
                      href={`https://wa.me/${phoneNumber}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="hidden"
                      id="wa-fallback"
                    />
                  ) : null}
                  <Button type="submit" variant="gold" disabled={!parent.user.phone}>
                    <Send className="h-4 w-4" /> Log + open WhatsApp
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Quick templates */}
          <Card className="mt-6">
            <CardHeader><CardTitle>Quick templates</CardTitle></CardHeader>
            <CardBody className="grid sm:grid-cols-2 gap-3">
              {QUICK_TEMPLATES.map(t => {
                const text = t.body.replace("{child}", childName);
                const waUrl = phoneNumber ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(text)}` : "#";
                return (
                  <a
                    key={t.name}
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={`block p-3 rounded-lg border transition-colors ${phoneNumber ? "border-slate-200 hover:border-brand-300 hover:bg-brand-50" : "border-slate-200 opacity-50 pointer-events-none"}`}
                  >
                    <p className="font-semibold text-sm text-brand-900 mb-1">{t.name}</p>
                    <p className="text-xs text-slate-600 line-clamp-2">{text}</p>
                  </a>
                );
              })}
            </CardBody>
          </Card>
        </div>

        {/* Message history */}
        <Card>
          <CardHeader>
            <CardTitle>Recent messages</CardTitle>
            <Badge tone="neutral">{history.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {history.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No WhatsApp history with this parent yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {history.map(m => (
                  <div key={m.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <Badge tone={m.direction === "OUT" ? "info" : "neutral"}>{m.direction === "OUT" ? "Sent" : "Received"}</Badge>
                      <span className="text-slate-500">{dateFmt.format(m.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap line-clamp-4">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
