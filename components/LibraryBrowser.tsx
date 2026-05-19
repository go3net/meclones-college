import { Card, CardBody, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requestBook } from "@/app/portal/admin/library/actions";
import { BookOpen, ShoppingBag, ArrowRight } from "lucide-react";

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const statusTone: Record<string, "info" | "success" | "neutral" | "warning"> = {
  PENDING: "warning",
  APPROVED: "info",
  REJECTED: "neutral",
  COLLECTED: "success",
  RETURNED: "neutral",
};

interface Props {
  userId: string;
  /** "student" or "parent" — controls badge labels only. */
  role: "student" | "parent";
}

export async function LibraryBrowser({ userId, role }: Props) {
  const [books, myRequests] = await Promise.all([
    prisma.book.findMany({ where: { availability: { not: "ARCHIVED" } }, orderBy: { title: "asc" } }),
    prisma.bookRequest.findMany({
      where: { requesterId: userId },
      include: { book: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      {/* My requests */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My requests ({myRequests.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {myRequests.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No book requests yet. Browse the catalogue below.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {myRequests.map(r => (
                <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-brand-900">{r.book.title}</p>
                    <p className="text-xs text-slate-500">
                      {r.type === "PURCHASE" ? "Purchase" : "Rental"} · requested {dateFmt.format(r.createdAt)}
                      {r.dueDate && r.status === "COLLECTED" && ` · return by ${dateFmt.format(r.dueDate)}`}
                    </p>
                  </div>
                  <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Catalogue */}
      <Card>
        <CardHeader>
          <CardTitle>Library catalogue ({books.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {books.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No books available yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {books.map(b => {
                const inStock = Math.max(0, b.totalCopies - b.copiesOut);
                return (
                  <div key={b.id} className="px-5 py-4 grid md:grid-cols-[1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-brand-900">{b.title}</p>
                        {b.category && <Badge tone="neutral">{b.category}</Badge>}
                      </div>
                      <p className="text-sm text-slate-600">{b.author ?? "Unknown author"}</p>
                      {b.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        {b.pricePurchase && <span>Buy: <strong className="text-brand-900">{nairaFmt.format(Number(b.pricePurchase))}</strong></span>}
                        {b.priceRental && <span>Rent: <strong className="text-brand-900">{nairaFmt.format(Number(b.priceRental))}</strong>/term</span>}
                        <span>In stock: {inStock}/{b.totalCopies}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {b.pricePurchase !== null && (
                        <form action={requestBook}>
                          <input type="hidden" name="bookId" value={b.id} />
                          <input type="hidden" name="type" value="PURCHASE" />
                          <Button type="submit" variant="outline" className="text-xs whitespace-nowrap">
                            <ShoppingBag className="h-3 w-3" /> Buy
                          </Button>
                        </form>
                      )}
                      {b.priceRental !== null && (
                        <form action={requestBook}>
                          <input type="hidden" name="bookId" value={b.id} />
                          <input type="hidden" name="type" value="RENTAL" />
                          <Button type="submit" variant="gold" disabled={inStock === 0} className="text-xs whitespace-nowrap">
                            <BookOpen className="h-3 w-3" /> {inStock === 0 ? "Out" : "Rent"}
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
