import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { ensureMainBranch } from "@/lib/branch";
import { createBranch, updateBranch, toggleBranchActive } from "./actions";
import {
  ArrowLeft, Building2, Plus, CheckCircle2, AlertCircle, Edit, ShieldOff, ShieldCheck, Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { added?: string; saved?: string; toggled?: string; error?: string };

export default async function BranchesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  // First load: make sure the Main branch exists.
  await ensureMainBranch();

  const branches = await prisma.branch.findMany({
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          students: true,
          teachers: true,
          classes: true,
        },
      },
    },
  });

  const activeCount = branches.filter(b => b.isActive).length;
  const studentTotal = branches.reduce((s, b) => s + b._count.students, 0);

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link href="/portal/director" className="text-slate-500 hover:text-brand-700 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> Multi-branch
            </p>
            <h1 className="text-2xl font-bold text-brand-900">Branches</h1>
            <p className="text-sm text-slate-500">
              Add campuses for school groups that operate across more than one location. Every record in the system (students, teachers, classes, fees) scopes to a branch — single-branch schools just use Main.
            </p>
          </div>
        </div>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Branch <strong>{decodeURIComponent(searchParams.added)}</strong> created.
        </div>
      )}
      {searchParams.saved && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved.
        </div>
      )}
      {searchParams.toggled && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Branch status updated.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="Active branches" value={activeCount} icon={<Building2 className="h-5 w-5" />} accent="brand" />
        <StatCard label="Total branches" value={branches.length} accent="neutral" />
        <StatCard label="Students" value={studentTotal} hint="across all branches" icon={<Users className="h-5 w-5" />} accent="emerald" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle><Plus className="h-4 w-4 inline mr-1" /> Add a branch</CardTitle>
          <Badge tone="gold">Director / Super-admin only</Badge>
        </CardHeader>
        <CardBody>
          <form action={createBranch} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <Label>Short code *</Label>
              <Input name="code" required minLength={2} maxLength={8} placeholder="LKI / IKJ / IBN" className="uppercase font-mono" />
              <p className="text-[11px] text-slate-500 mt-1">2–8 chars, letters/numbers. Used in admission numbers + URLs.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Branch name *</Label>
              <Input name="name" required minLength={2} placeholder="e.g. Lekki Campus" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input name="phone" placeholder="+234…" />
            </div>
            <div>
              <Label>Email</Label>
              <Input name="email" type="email" placeholder="lekki@yourschool.com" />
            </div>
            <div>
              <Label>Address</Label>
              <Input name="address" placeholder="Street, city" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" variant="gold"><Plus className="h-4 w-4" /> Create branch</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
          <Badge tone="neutral">{branches.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-100">
            {branches.map(b => (
              <div key={b.id} className="px-4 py-3 grid lg:grid-cols-[1fr_auto] gap-3 items-start">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-brand-900">{b.name}</p>
                    <Badge tone="neutral" className="font-mono">{b.code}</Badge>
                    {b.isMain && <Badge tone="gold">Main</Badge>}
                    {!b.isActive && <Badge tone="danger">Inactive</Badge>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-x-3">
                    {b.address && <span>📍 {b.address}</span>}
                    {b.phone && <span>📞 {b.phone}</span>}
                    {b.email && <span>✉ {b.email}</span>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    <strong>{b._count.students}</strong> student{b._count.students === 1 ? "" : "s"} ·{" "}
                    <strong>{b._count.teachers}</strong> teacher{b._count.teachers === 1 ? "" : "s"} ·{" "}
                    <strong>{b._count.classes}</strong> class{b._count.classes === 1 ? "" : "es"}
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <details className="text-xs">
                    <summary className="cursor-pointer text-brand-700 hover:underline inline-flex items-center gap-1 px-2 py-1.5">
                      <Edit className="h-3 w-3" /> Edit
                    </summary>
                    <form action={updateBranch} className="mt-2 grid sm:grid-cols-2 gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
                      <input type="hidden" name="id" value={b.id} />
                      <div className="sm:col-span-2">
                        <Label>Name</Label>
                        <Input name="name" defaultValue={b.name} required minLength={2} />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input name="phone" defaultValue={b.phone ?? ""} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input name="email" type="email" defaultValue={b.email ?? ""} />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Address</Label>
                        <Input name="address" defaultValue={b.address ?? ""} />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <Button type="submit" variant="outline" className="text-xs">Save</Button>
                      </div>
                    </form>
                  </details>
                  {!b.isMain && (
                    <form action={toggleBranchActive}>
                      <input type="hidden" name="id" value={b.id} />
                      <Button type="submit" variant="outline" className="text-xs">
                        {b.isActive
                          ? <><ShieldOff className="h-3 w-3" /> Deactivate</>
                          : <><ShieldCheck className="h-3 w-3" /> Reactivate</>}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-slate-500 mt-4">
        💡 Tip: Once you have more than one branch, a switcher appears in the admin header. Pick a branch and every list view filters to it. Pick "All branches" to see consolidated data.
      </p>
    </PortalShell>
  );
}
