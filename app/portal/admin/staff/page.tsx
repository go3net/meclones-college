import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Input, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { resetUserPassword, toggleUserActive } from "./actions";
import { Users, KeyRound, CheckCircle2, AlertCircle, ShieldCheck, ShieldOff, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const roleTone: Record<string, "neutral" | "info" | "warning" | "success" | "gold"> = {
  SUPER_ADMIN: "gold",
  DIRECTOR: "gold",
  ADMIN: "info",
  ACCOUNTANT: "info",
  TEACHER: "success",
  PARENT: "neutral",
  STUDENT: "warning",
};

type SearchParams = { q?: string; role?: string; reset?: string; error?: string };

export default async function StaffPanelPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const q = (searchParams.q ?? "").trim();
  const roleFilter = (searchParams.role ?? "ALL").toUpperCase();

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }
  if (["SUPER_ADMIN", "DIRECTOR", "ADMIN", "ACCOUNTANT", "TEACHER", "PARENT", "STUDENT"].includes(roleFilter)) {
    where.role = roleFilter;
  }

  const [users, total, byRole] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        student: { select: { admissionNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
  ]);

  const counts = byRole.reduce((acc, r) => { acc[r.role] = r._count.role; return acc; }, {} as Record<string, number>);
  const activeCount = await prisma.user.count({ where: { isActive: true } });

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Staff & Account Management</h1>
        <p className="text-sm text-slate-500">Reset passwords, deactivate accounts, and audit every login across the school.</p>
      </div>

      {searchParams.reset && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Password reset for {decodeURIComponent(searchParams.reset)}.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total users" value={total} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Active" value={activeCount} accent="emerald" />
        <StatCard label="Teachers" value={counts.TEACHER ?? 0} accent="sky" />
        <StatCard label="Students" value={counts.STUDENT ?? 0} accent="gold" />
        <StatCard label="Parents" value={counts.PARENT ?? 0} accent="amber" />
      </div>

      <Card className="mb-4">
        <CardBody className="py-3">
          <form action="/portal/admin/staff" method="GET" className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={q} placeholder="Search by name, email or phone..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
            <select name="role" defaultValue={roleFilter} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="ALL">All roles</option>
              <option value="SUPER_ADMIN">Super admin</option>
              <option value="DIRECTOR">Director</option>
              <option value="ADMIN">Admin</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="TEACHER">Teacher</option>
              <option value="PARENT">Parent</option>
              <option value="STUDENT">Student</option>
            </select>
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Filter</button>
            {(q || roleFilter !== "ALL") && <Link href="/portal/admin/staff" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Clear</Link>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length} shown)</CardTitle>
          <Badge tone="neutral">Default password: <code className="font-mono">Meclones123!</code></Badge>
        </CardHeader>
        <CardBody className="p-0">
          {users.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No users match.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map(u => (
                <div key={u.id} className="px-5 py-3 grid lg:grid-cols-[1fr_auto] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-brand-900">{u.name}</p>
                      <Badge tone={roleTone[u.role]}>{u.role.toLowerCase().replace("_", " ")}</Badge>
                      {!u.isActive && <Badge tone="danger">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {u.email}
                      {u.phone && ` · ${u.phone}`}
                      {u.student?.admissionNumber && ` · Adm: ${u.student.admissionNumber}`}
                      {` · Joined ${dateFmt.format(u.createdAt)}`}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    <form action={resetUserPassword} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={u.id} />
                      <Input name="newPassword" type="text" placeholder="New password" minLength={8} required className="w-44 text-xs" />
                      <Button type="submit" variant="outline" className="text-xs"><KeyRound className="h-3 w-3" /> Reset</Button>
                    </form>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="active" value={u.isActive ? "false" : "true"} />
                      <Button type="submit" variant="outline" className="text-xs">
                        {u.isActive ? <><ShieldOff className="h-3 w-3" /> Deactivate</> : <><ShieldCheck className="h-3 w-3" /> Reactivate</>}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-slate-500 mt-4">
        Tip: students can sign in with either their email or their admission number (e.g. <code className="font-mono">MCL/SS3A/2526/001</code>). After a password reset, share the new credentials with the user privately — they'll log in immediately.
      </p>
    </PortalShell>
  );
}
