import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { UserCircle2, Plus, CheckCircle2, Users, MessageCircle, Send } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { q?: string; added?: string };

export default async function AdminParentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const q = (searchParams.q ?? "").trim();

  const where = q ? {
    user: {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { email: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q, mode: "insensitive" as const } },
      ],
    },
  } : {};

  const [parents, totalParents, optIns] = await Promise.all([
    prisma.parent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true, createdAt: true } },
        children: {
          include: { student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } } },
        },
      },
      take: 200,
    }),
    prisma.parent.count(),
    prisma.parent.count({ where: { whatsappOptIn: true } }),
  ]);

  const totalChildren = parents.reduce((s, p) => s + p.children.length, 0);

  return (
    <PortalShell role="school_admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Parents</h1>
          <p className="text-sm text-slate-500">{totalParents} parent account{totalParents === 1 ? "" : "s"} · {totalChildren} linked child{totalChildren === 1 ? "" : "ren"}</p>
        </div>
        <Link href="/portal/admin/parents/new" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="h-4 w-4" /> Add Parent
        </Link>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Parent "{decodeURIComponent(searchParams.added)}" created.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Parents" value={totalParents} icon={<UserCircle2 className="h-5 w-5" />} accent="brand" />
        <StatCard label="Children linked" value={totalChildren} icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="WhatsApp opt-in" value={optIns} hint={`${totalParents > 0 ? Math.round((optIns / totalParents) * 100) : 0}% of parents`} icon={<MessageCircle className="h-5 w-5" />} accent="sky" />
        <StatCard label="Avg per parent" value={totalParents > 0 ? (totalChildren / totalParents).toFixed(1) : "0"} hint="children" accent="gold" />
      </div>

      <Card className="mb-4">
        <CardBody className="py-3">
          <form action="/portal/admin/parents" method="GET" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by name, email or phone..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2 rounded-lg">Search</button>
            {q && <Link href="/portal/admin/parents" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2">Clear</Link>}
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{q ? `Results for "${q}"` : "All parents"}</CardTitle>
          <Badge tone="neutral">{parents.length} shown</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {parents.length === 0 ? (
            <div className="py-12 text-center">
              <UserCircle2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700">No parents match</p>
              <p className="text-sm text-slate-500 mt-1">Add a parent or clear your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium">Contact</th>
                    <th className="text-left px-4 py-2.5 font-medium">Children</th>
                    <th className="text-left px-4 py-2.5 font-medium">WhatsApp</th>
                    <th className="text-left px-4 py-2.5 font-medium">Created</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parents.map(p => (
                    <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        <Link href={`/portal/admin/parents/${p.id}/edit`} className="hover:text-brand-700">{p.user.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-[12px]">
                        <div>{p.user.email}</div>
                        {p.user.phone && <div className="text-slate-400">{p.user.phone}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {p.children.length === 0 ? <span className="text-xs text-slate-400">None</span> : p.children.map(c => (
                            <Link key={c.id} href={`/portal/admin/students/${c.student.id}`}>
                              <Badge tone="neutral">{c.student.user.name}{c.student.classRef && ` · ${c.student.classRef.name}${c.student.classRef.arm}`}</Badge>
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.whatsappOptIn ? <Badge tone="success">Opted in</Badge> : <Badge tone="neutral">No</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[12px]">{dateFmt.format(p.user.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/portal/admin/parents/${p.id}/whatsapp`} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded">
                          <Send className="h-3 w-3" /> WhatsApp
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
