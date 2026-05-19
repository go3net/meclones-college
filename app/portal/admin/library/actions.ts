"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";

const BookSchema = z.object({
  title: z.string().min(1),
  author: z.string().optional(),
  isbn: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  totalCopies: z.coerce.number().int().min(0).default(1),
  pricePurchase: z.coerce.number().min(0).optional(),
  priceRental: z.coerce.number().min(0).optional(),
  coverUrl: z.string().url().optional().or(z.literal("")),
});

export async function createBook(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const parsed = BookSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author") || undefined,
    isbn: formData.get("isbn") || undefined,
    category: formData.get("category") || undefined,
    description: formData.get("description") || undefined,
    totalCopies: formData.get("totalCopies") || 1,
    pricePurchase: formData.get("pricePurchase") || undefined,
    priceRental: formData.get("priceRental") || undefined,
    coverUrl: formData.get("coverUrl") || undefined,
  });

  if (!parsed.success) {
    redirect(`/portal/admin/library?error=${encodeURIComponent("Invalid book data")}`);
  }
  const d = parsed.data;

  await prisma.book.create({
    data: {
      title: d.title,
      author: d.author || null,
      isbn: d.isbn || null,
      category: d.category || null,
      description: d.description || null,
      totalCopies: d.totalCopies ?? 1,
      pricePurchase: d.pricePurchase !== undefined ? d.pricePurchase : null,
      priceRental: d.priceRental !== undefined ? d.priceRental : null,
      coverUrl: d.coverUrl || null,
    },
  });

  revalidatePath("/portal/admin/library");
  redirect(`/portal/admin/library?added=${encodeURIComponent(d.title)}`);
}

export async function setBookRequestStatus(formData: FormData) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const dueDateStr = String(formData.get("dueDate") ?? "");

  const valid = ["APPROVED", "REJECTED", "COLLECTED", "RETURNED"];
  if (!id || !valid.includes(status)) {
    throw new Error("Invalid request update");
  }

  const req = await prisma.bookRequest.findUnique({ where: { id }, include: { book: true } });
  if (!req) throw new Error("Request not found");

  // Update copies-out counter for rentals on collection/return.
  if (status === "COLLECTED" && req.type === "RENTAL" && req.status !== "COLLECTED") {
    await prisma.book.update({
      where: { id: req.bookId },
      data: { copiesOut: { increment: 1 } },
    });
  } else if (status === "RETURNED" && req.status === "COLLECTED") {
    await prisma.book.update({
      where: { id: req.bookId },
      data: { copiesOut: { decrement: 1 } },
    });
  }

  await prisma.bookRequest.update({
    where: { id },
    data: {
      status: status as "APPROVED" | "REJECTED" | "COLLECTED" | "RETURNED",
      decidedById: user.id,
      decidedAt: new Date(),
      dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
    },
  });

  revalidatePath("/portal/admin/library");
  revalidatePath("/portal/student/library");
  revalidatePath("/portal/parent/library");
}

// Requester action (student or parent)
const RequestSchema = z.object({
  bookId: z.string().min(1),
  type: z.enum(["PURCHASE", "RENTAL"]),
  notes: z.string().optional(),
});

export async function requestBook(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const parsed = RequestSchema.safeParse({
    bookId: formData.get("bookId"),
    type: formData.get("type"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new Error("Invalid request");

  await prisma.bookRequest.create({
    data: {
      bookId: parsed.data.bookId,
      requesterId: user.id,
      type: parsed.data.type,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/portal/admin/library");
  revalidatePath("/portal/student/library");
  revalidatePath("/portal/parent/library");

  // Redirect requester back to their library with a success flag.
  const back = user.role === "STUDENT" ? "/portal/student/library" : "/portal/parent/library";
  redirect(`${back}?requested=1`);
}
