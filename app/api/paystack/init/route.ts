import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { initTransaction, genReference } from "@/lib/paystack";
import { SCHOOL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  feeId: z.string().min(1),
  amount: z.coerce.number().min(100, "Minimum payment is ₦100"),
});

/**
 * Parent (or student) clicks "Pay now". We:
 *  1. Authorize: only the linked parent or the student themselves can pay
 *  2. Create a pending Payment row with a fresh reference
 *  3. Call Paystack /transaction/initialize and return the hosted URL
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const { feeId, amount } = parsed.data;

  const fee = await prisma.fee.findUnique({
    where: { id: feeId },
    include: {
      student: {
        include: {
          user: true,
          parentLinks: { include: { parent: true } },
        },
      },
    },
  });
  if (!fee) return NextResponse.json({ error: "Fee not found" }, { status: 404 });

  // Authorize: parent of this student, the student themselves, or admin/director.
  const role = user.role;
  let allowed = false;
  if (["ADMIN", "DIRECTOR", "SUPER_ADMIN", "ACCOUNTANT"].includes(role)) {
    allowed = true;
  } else if (role === "STUDENT") {
    allowed = fee.student.user.id === user.id;
  } else if (role === "PARENT") {
    const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
    if (parent) {
      allowed = fee.student.parentLinks.some(l => l.parentId === parent.id);
    }
  }
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cap payment at the outstanding balance.
  const balance = Number(fee.balance);
  if (balance <= 0) {
    return NextResponse.json({ error: "This fee has been fully paid." }, { status: 400 });
  }
  const amountToPay = Math.min(amount, balance);

  const reference = genReference("MCL-FEE");

  // Pending Payment row — flips to SUCCESS on webhook/callback.
  await prisma.payment.create({
    data: {
      feeId: fee.id,
      amount: amountToPay,
      reference,
      method: "PAYSTACK",
      status: "PENDING",
      createdById: user.id,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website;
  const callbackUrl = `${siteUrl.replace(/\/$/, "")}/api/paystack/callback`;
  const email = fee.student.user.email; // Paystack requires *some* email

  try {
    const result = await initTransaction({
      email,
      amountNaira: amountToPay,
      reference,
      callbackUrl,
      metadata: {
        feeId: fee.id,
        studentId: fee.studentId,
        feeType: fee.feeType,
      },
    });
    return NextResponse.json({ authorization_url: result.authorization_url, reference }, { status: 200 });
  } catch (err) {
    // Mark the pending payment as FAILED so the audit trail is honest.
    await prisma.payment.update({
      where: { reference },
      data: { status: "FAILED", notes: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Paystack init failed" },
      { status: 502 },
    );
  }
}
