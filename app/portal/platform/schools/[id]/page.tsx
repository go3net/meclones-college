import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformShell } from "@/components/PlatformShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, Select, StatCard } from "@/components/ui";
import { prismaBase } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PLATFORM_ROOT_DOMAIN } from "@/lib/host-utils";
import { isEncryptionConfigured } from "@/lib/crypto";
import { allowedOrigins, embedSnippet, ensureEmbedKey } from "@/lib/embed";
import { updateSchool, updateIntegrations, deleteSchool } from "../actions";
import { ArrowLeft, CheckCircle2, AlertCircle, Users, GraduationCap, Smartphone, CreditCard, Trash2, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { created?: string; saved?: string; error?: string };

export default async function PlatformSchoolPage({ params, searchParams }: { params: { id: string }; searchParams: SearchParams }) {
  await requireRole("PLATFORM_ADMIN");

  const s = await prismaBase.school.findUnique({ where: { id: params.id } });
  if (!s) notFound();

  const [students, teachers, users, admins] = await Promise.all([
    prismaBase.student.count({ where: { schoolId: s.id } }),
    prismaBase.teacher.count({ where: { schoolId: s.id } }),
    prismaBase.user.count({ where: { schoolId: s.id } }),
    prismaBase.user.findMany({
      where: { schoolId: s.id, role: { in: ["SUPER_ADMIN", "DIRECTOR"] } },
      select: { name: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
  ]);

  const portalUrl = s.customDomain ? `https://${s.customDomain}` : `https://${s.slug}.${PLATFORM_ROOT_DOMAIN}`;
  const encryptionReady = isEncryptionConfigured();
  const embedKey = await ensureEmbedKey(s.id);
  const embedOrigins = allowedOrigins(s);

  return (
    <PlatformShell>
      <div className="mb-6 flex items-start gap-3">
        <Link href="/portal/platform/schools" className="text-slate-500 hover:text-brand-700 mt-1" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-brand-900">{s.name}</h1>
            <Badge tone="neutral" className="font-mono">{s.code}</Badge>
            <Badge tone={s.status === "SUSPENDED" ? "danger" : s.status === "TRIAL" ? "gold" : "neutral"}>{s.status}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            <a href={portalUrl} target="_blank" rel="noreferrer noopener" className="text-brand-700 hover:underline inline-flex items-center gap-1">
              {portalUrl.replace(/^https:\/\//, "")} <ExternalLink className="h-3 w-3" />
            </a>
            {" · "}created {s.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}
          </p>
        </div>
      </div>

      {searchParams.created && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> School created. Its super-admin can sign in at {portalUrl}/portal/login with the password you set.
        </div>
      )}
      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Students" value={students} icon={<GraduationCap className="h-5 w-5" />} accent="brand" />
        <StatCard label="Teachers" value={teachers} icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Accounts" value={users} hint="all roles" accent="gold" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Identity & contact</CardTitle>
          <Badge tone="neutral">slug: {s.slug}</Badge>
        </CardHeader>
        <CardBody>
          <form action={updateSchool} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <input type="hidden" name="id" value={s.id} />
            <div className="sm:col-span-2">
              <Label>School name *</Label>
              <Input name="name" required minLength={2} defaultValue={s.name} />
            </div>
            <div>
              <Label>Short name *</Label>
              <Input name="shortName" required minLength={2} defaultValue={s.shortName} />
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={s.status}>
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </Select>
            </div>
            <div>
              <Label>Custom domain</Label>
              <Input name="customDomain" defaultValue={s.customDomain ?? ""} placeholder="school.edu.ng" className="lowercase" />
              <p className="text-[11px] text-slate-500 mt-1">Point its DNS at the platform, then add it on Railway.</p>
            </div>
            <div>
              <Label>Tagline</Label>
              <Input name="tagline" defaultValue={s.tagline ?? ""} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" defaultValue={s.phone ?? ""} />
            </div>
            <div>
              <Label>Phone (international)</Label>
              <Input name="phoneIntl" defaultValue={s.phoneIntl ?? ""} />
            </div>
            <div>
              <Label>WhatsApp number</Label>
              <Input name="whatsapp" defaultValue={s.whatsapp ?? ""} />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={s.email ?? ""} />
            </div>
            <div>
              <Label>Admissions email</Label>
              <Input name="admissionsEmail" type="email" defaultValue={s.admissionsEmail ?? ""} />
            </div>
            <div>
              <Label>Website</Label>
              <Input name="website" defaultValue={s.website ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" defaultValue={s.address ?? ""} />
            </div>
            <div>
              <Label>Short address</Label>
              <Input name="addressShort" defaultValue={s.addressShort ?? ""} />
            </div>
            <div>
              <Label>Office hours</Label>
              <Input name="hours" defaultValue={s.hours ?? ""} />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="publicSiteEnabled" defaultChecked={s.publicSiteEnabled} className="h-4 w-4" />
                Serve a public website
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" variant="gold">Save changes</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle><Smartphone className="h-4 w-4 inline mr-1" /> WhatsApp & <CreditCard className="h-4 w-4 inline mx-1" /> Paystack</CardTitle>
          {encryptionReady
            ? <Badge tone="neutral">Secrets encrypted at rest</Badge>
            : <Badge tone="danger">APP_ENCRYPTION_KEY not set</Badge>}
        </CardHeader>
        <CardBody>
          <form action={updateIntegrations} className="grid sm:grid-cols-2 gap-3 text-sm">
            <input type="hidden" name="id" value={s.id} />
            <div>
              <Label>Meta phone number id</Label>
              <Input name="whatsappPhoneNumberId" defaultValue={s.whatsappPhoneNumberId ?? ""} placeholder="1234567890" className="font-mono" />
              <p className="text-[11px] text-slate-500 mt-1">From Meta Business → WhatsApp → API setup. Inbound messages to this number route to this school.</p>
            </div>
            <div>
              <Label>WhatsApp access token {s.whatsappAccessTokenEnc ? <Badge tone="gold">stored</Badge> : <Badge tone="neutral">using platform token</Badge>}</Label>
              <Input name="whatsappAccessToken" type="password" autoComplete="off" placeholder={s.whatsappAccessTokenEnc ? "Leave blank to keep" : "Optional: only if this number needs its own token"} />
              {s.whatsappAccessTokenEnc && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <input type="checkbox" name="clearWhatsappToken" className="h-3.5 w-3.5" /> Remove stored token
                </label>
              )}
            </div>
            <div>
              <Label>Paystack subaccount code</Label>
              <Input name="paystackSubaccountCode" defaultValue={s.paystackSubaccountCode ?? ""} placeholder="ACCT_xxxxxxxx" className="font-mono" />
              <p className="text-[11px] text-slate-500 mt-1">Fees paid through the platform key settle into this subaccount.</p>
            </div>
            <div>
              <Label>Paystack public key</Label>
              <Input name="paystackPublicKey" defaultValue={s.paystackPublicKey ?? ""} placeholder="pk_live_…" className="font-mono" />
            </div>
            <div className="sm:col-span-2">
              <Label>Paystack secret key {s.paystackSecretKeyEnc ? <Badge tone="gold">stored</Badge> : <Badge tone="neutral">using platform key</Badge>}</Label>
              <Input name="paystackSecretKey" type="password" autoComplete="off" placeholder={s.paystackSecretKeyEnc ? "Leave blank to keep" : "Optional: the school's own Paystack account"} />
              {s.paystackSecretKeyEnc && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <input type="checkbox" name="clearPaystackSecret" className="h-3.5 w-3.5" /> Remove stored key
                </label>
              )}
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="gold">Save integrations</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Website widget</CardTitle>
          <Badge tone={s.embedEnabled ? "gold" : "danger"}>{s.embedEnabled ? "on" : "off"}</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-600 mb-2">
            For schools with their own website. The director manages this at <code className="bg-slate-100 px-1 rounded">/portal/director/website-widget</code>; shown here for support.
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto select-all">{embedSnippet(embedKey)}</pre>
          <p className="text-xs text-slate-500 mt-2">
            Allowed websites: {embedOrigins.length === 0 ? "any" : embedOrigins.join(", ")} · preview at{" "}
            <a href={`${portalUrl}/embed/preview`} target="_blank" rel="noreferrer noopener" className="text-brand-700 hover:underline">{portalUrl.replace(/^https:\/\//, "")}/embed/preview</a>
          </p>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <Badge tone="neutral">{admins.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-100">
            {admins.map(a => (
              <div key={a.email} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.email}</p>
                </div>
                <Badge tone="neutral">{a.role}</Badge>
              </div>
            ))}
            {admins.length === 0 && <p className="px-4 py-4 text-sm text-slate-500">No director or super-admin accounts.</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><Trash2 className="h-4 w-4 inline mr-1 text-rose-600" /> Danger zone</CardTitle>
          <Badge tone="danger">Irreversible</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-slate-600 mb-3">
            Deleting removes the school and <strong>every row it owns</strong>: accounts, students, results, payments, messages. Suspend it first, then type its slug to confirm.
          </p>
          <form action={deleteSchool} className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="id" value={s.id} />
            <div>
              <Label>Type <span className="font-mono">{s.slug}</span> to confirm</Label>
              <Input name="confirmSlug" placeholder={s.slug} className="font-mono" />
            </div>
            <Button type="submit" variant="outline" className="text-rose-700 border-rose-300 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Delete school
            </Button>
          </form>
        </CardBody>
      </Card>
    </PlatformShell>
  );
}
