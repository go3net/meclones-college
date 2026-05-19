import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, StatCard, Input, Textarea, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { createBook, setBookRequestStatus } from "./actions";
import { BookOpen, Plus, CheckCircle2, X, ShoppingBag, Clock, BookCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const statusTone: Record<string, "info" | "success" | "neutral" | "warning"> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "neutral",
  COLLECTED: "success",
  RETURNED: "neutral",
};

type SearchParams = { added?: string };

export default async function AdminLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [books, pendingRequests, allRequests, counts] = await Promise.all([
    prisma.book.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.bookRequest.findMany({
      where: { status: "PENDING" },
      include: { book: { select: { title: true, author: true } }, requester: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.bookRequest.count(),
    prisma.bookRequest.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const statusCounts = counts.reduce((acc, r) => { acc[r.status] = r._count.status; return acc; }, {} as Record<string, number>);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Library</h1>
        <p className="text-sm text-slate-500">Manage books, approve student/parent requests, and track rentals.</p>
      </div>

      {searchParams.added && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Book "{decodeURIComponent(searchParams.added)}" added.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Books" value={books.length} icon={<BookOpen className="h-5 w-5" />} accent="brand" />
        <StatCard label="Pending" value={statusCounts.PENDING ?? 0} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label="Approved" value={statusCounts.APPROVED ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="sky" />
        <StatCard label="Out (rented)" value={statusCounts.COLLECTED ?? 0} icon={<BookCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Total requests" value={allRequests} icon={<ShoppingBag className="h-5 w-5" />} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Pending requests queue */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pending requests ({pendingRequests.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {pendingRequests.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">All caught up — no pending requests.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingRequests.map(r => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-medium text-brand-900">{r.book.title}</p>
                        <p className="text-xs text-slate-500">
                          {r.requester.name} ({r.requester.role.toLowerCase()}) · {r.type === "PURCHASE" ? "Purchase" : "Rental"} · {dateFmt.format(r.createdAt)}
                        </p>
                        {r.notes && <p className="text-xs text-slate-600 italic mt-1">"{r.notes}"</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={setBookRequestStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="APPROVED" />
                          {r.type === "RENTAL" && (
                            <input type="hidden" name="dueDate" value={new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)} />
                          )}
                          <Button type="submit" variant="gold" className="text-xs"><CheckCircle2 className="h-3 w-3" /> Approve</Button>
                        </form>
                        <form action={setBookRequestStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value="REJECTED" />
                          <Button type="submit" variant="outline" className="text-xs text-rose-700 hover:bg-rose-50"><X className="h-3 w-3" /> Reject</Button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Add new book */}
        <Card>
          <CardHeader>
            <CardTitle>Add new book</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={createBook} className="space-y-3 text-sm">
              <div><Label>Title *</Label><Input name="title" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Author</Label><Input name="author" /></div>
                <div><Label>Category</Label><Input name="category" placeholder="e.g. Fiction" /></div>
              </div>
              <div><Label>ISBN</Label><Input name="isbn" /></div>
              <div><Label>Copies</Label><Input name="totalCopies" type="number" min={0} defaultValue={1} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Purchase ₦</Label><Input name="pricePurchase" type="number" min={0} step="100" /></div>
                <div><Label>Rental ₦ / term</Label><Input name="priceRental" type="number" min={0} step="100" /></div>
              </div>
              <div><Label>Cover URL</Label><Input name="coverUrl" type="url" placeholder="https://..." /></div>
              <div><Label>Description</Label><Textarea name="description" rows={2} /></div>
              <Button type="submit" variant="gold" className="w-full"><Plus className="h-4 w-4" /> Add book</Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* Books catalogue */}
      <Card>
        <CardHeader>
          <CardTitle>Catalogue ({books.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {books.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No books yet. Add the first one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Title</th>
                    <th className="text-left px-4 py-2.5 font-medium">Author</th>
                    <th className="text-left px-4 py-2.5 font-medium">Category</th>
                    <th className="text-right px-4 py-2.5 font-medium">Purchase</th>
                    <th className="text-right px-4 py-2.5 font-medium">Rental</th>
                    <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(b => (
                    <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-brand-900">{b.title}</td>
                      <td className="px-4 py-2.5 text-slate-700">{b.author ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{b.category ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{b.pricePurchase ? nairaFmt.format(Number(b.pricePurchase)) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">{b.priceRental ? nairaFmt.format(Number(b.priceRental)) : "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge tone={b.copiesOut >= b.totalCopies ? "warning" : "success"}>
                          {Math.max(0, b.totalCopies - b.copiesOut)} / {b.totalCopies}
                        </Badge>
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
