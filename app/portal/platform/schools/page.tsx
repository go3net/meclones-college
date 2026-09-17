import Link from "next/link";
import { PlatformShell } from "@/components/PlatformShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, StatCard } from "@/components/ui";
import { prismaBase } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { PLATFORM_ROOT_DOMAIN } from "@/lib/host-utils";
import { createSchool } from "./actions";
import { Building2, Plus, CheckCircle2, AlertCircle, ArrowRight, Users } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string; deleted?: string };

const STATUS_TONE: Record<string, "gold" | "neutral" | "danger"> = {
  TRIAL: "gold",
  ACTIVE: "neutral",
  SUSPENDED: "danger",
};

export default async function PlatformSchoolsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("PLATFORM_ADMIN");

  const schools = await prismaBase.school.findMany({ orderBy: { createdAt: "asc" } });
  const counts = await Promise.all(
    schools.map(s => Promise.all([
      prismaBase.student.count({ where: { schoolId: s.id } }),
      prismaBase.user.count({ where: { schoolId: s.id } }),
    ])),
  );
  const totalStudents = counts.reduce((sum, [students]) => sum + students, 0);

  return (
    <PlatformShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" /> Platform
        </p>
        <h1 className="text-2xl font-bold text-brand-900">Schools</h1>
        <p className="text-sm text-slate-500">
          Every school on SchoolBot. Each one gets its own portal at <code className="bg-slate-100 px-1 rounded">slug.{PLATFORM_ROOT_DOMAIN}</code> (or its custom domain), its own WhatsApp number and its own data.
        </p>
      </div>

      {searchParams.deleted && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> School <strong>{decodeURIComponent(searchParams.deleted)}</strong> and all of its data were deleted.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Schools" value={schools.length} icon={<Building2 className="h-5 w-5" />} accent="brand" />
        <StatCard label="Active" value={schools.filter(s => s.status === "ACTIVE").length} accent="emerald" />
        <StatCard label="Students" value={totalStudents} hint="across all schools" icon={<Users className="h-5 w-5" />} accent="gold" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Schools</CardTitle>
          <Badge tone="neutral">{schools.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-100">
            {schools.map((s, i) => (
              <Link key={s.id} href={`/portal/platform/schools/${s.id}`} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-brand-900">{s.name}</p>
                    <Badge tone="neutral" className="font-mono">{s.code}</Badge>
                    <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</Badge>
                    {s.whatsappPhoneNumberId && <Badge tone="gold">WhatsApp</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {s.slug}.{PLATFORM_ROOT_DOMAIN}{s.customDomain ? ` · ${s.customDomain}` : ""} · {counts[i][0]} students · {counts[i][1]} accounts
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              </Link>
            ))}
            {schools.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No schools yet.</p>}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><Plus className="h-4 w-4 inline mr-1" /> Add a school</CardTitle>
          <Badge tone="gold">Creates the school, its super-admin, Main branch and chatbot defaults</Badge>
        </CardHeader>
        <CardBody>
          <form action={createSchool} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="sm:col-span-2">
              <Label>School name *</Label>
              <Input name="name" required minLength={2} placeholder="Greensprings School Lekki" />
            </div>
            <div>
              <Label>Short name *</Label>
              <Input name="shortName" required minLength={2} placeholder="Greensprings" />
            </div>
            <div>
              <Label>Slug (subdomain) *</Label>
              <Input name="slug" required minLength={3} maxLength={40} placeholder="greensprings" className="font-mono lowercase" />
              <p className="text-[11px] text-slate-500 mt-1">Becomes slug.{PLATFORM_ROOT_DOMAIN}. Lowercase, numbers, hyphens.</p>
            </div>
            <div>
              <Label>Code *</Label>
              <Input name="code" required minLength={2} maxLength={4} placeholder="GSL" className="uppercase font-mono" />
              <p className="text-[11px] text-slate-500 mt-1">2-4 chars. Admission-number prefix, e.g. GSL/JSS1A/2526/001.</p>
            </div>
            <div>
              <Label>Custom domain</Label>
              <Input name="customDomain" placeholder="greensprings.edu.ng" className="lowercase" />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input name="tagline" placeholder="Motto" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" placeholder="0801 234 5678" />
            </div>
            <div>
              <Label>Phone (international)</Label>
              <Input name="phoneIntl" placeholder="+2348012345678" />
            </div>
            <div>
              <Label>WhatsApp number</Label>
              <Input name="whatsapp" placeholder="2348012345678" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="info@school.com" />
            </div>
            <div>
              <Label>Admissions email</Label>
              <Input name="admissionsEmail" type="email" placeholder="admissions@school.com" />
            </div>
            <div>
              <Label>Website</Label>
              <Input name="website" placeholder="https://school.com" />
            </div>
            <div className="sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" placeholder="Full address" />
            </div>
            <div>
              <Label>Short address</Label>
              <Input name="addressShort" placeholder="Area, City" />
            </div>
            <div>
              <Label>Office hours</Label>
              <Input name="hours" placeholder="Mon – Fri, 8:00am – 4:00pm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="publicSiteEnabled" defaultChecked className="h-4 w-4" />
                Serve a public website for this school
              </label>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 border-t border-slate-100 pt-3 mt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">First super-admin account</p>
            </div>
            <div>
              <Label>Admin name *</Label>
              <Input name="adminName" required minLength={2} placeholder="Mrs. Director" />
            </div>
            <div>
              <Label>Admin email *</Label>
              <Input name="adminEmail" type="email" required placeholder="director@school.com" />
            </div>
            <div>
              <Label>Temporary password *</Label>
              <Input name="adminPassword" type="password" required minLength={8} autoComplete="new-password" />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" variant="gold"><Plus className="h-4 w-4" /> Create school</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PlatformShell>
  );
}
