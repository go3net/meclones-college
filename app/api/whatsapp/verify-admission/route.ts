import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeWebhook, formatMainMenu } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const Body = z.object({
  admissionNumber: z.string().min(1),
  phoneNumber: z.string().optional(),
});

/**
 * Verify a parent's admission-number claim against a real student. Returns
 * student/parent info on success, 404 on no match. Also bootstraps (or
 * refreshes) a WhatsAppSession so later messages can be threaded.
 */
export async function POST(req: NextRequest) {
  const unauth = authorizeWebhook(req);
  if (unauth) return unauth;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const admissionNumber = parsed.data.admissionNumber.trim();
  const phoneNumber = parsed.data.phoneNumber?.trim();

  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      user: { select: { name: true } },
      classRef: { select: { name: true, arm: true } },
      parentLinks: {
        include: {
          parent: {
            include: { user: { select: { name: true, phone: true, email: true } } },
          },
        },
      },
    },
  });

  if (!student) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_found",
        message: "We could not find that admission number. Please check and try again, or call us.",
      },
      { status: 404 },
    );
  }

  const primaryParent = student.parentLinks[0]?.parent;
  const parentName = primaryParent?.user.name ?? "Parent";

  // Upsert a WhatsApp session keyed on phone+student.
  let sessionId: string | null = null;
  if (phoneNumber) {
    const existing = await prisma.whatsAppSession.findFirst({
      where: { phoneNumber, studentId: student.id },
    });
    const upserted = existing
      ? await prisma.whatsAppSession.update({
          where: { id: existing.id },
          data: { admissionNumber, lastActivity: new Date(), lastMenu: "MAIN" },
        })
      : await prisma.whatsAppSession.create({
          data: {
            phoneNumber,
            admissionNumber,
            studentId: student.id,
            userId: primaryParent?.userId ?? null,
            lastMenu: "MAIN",
          },
        });
    sessionId = upserted.id;
  }

  return NextResponse.json({
    ok: true,
    sessionId,
    student: {
      id: student.id,
      name: student.user.name,
      admissionNumber: student.admissionNumber,
      className: student.classRef ? `${student.classRef.name}${student.classRef.arm}` : null,
    },
    parent: primaryParent ? {
      name: primaryParent.user.name,
      phone: primaryParent.user.phone,
      email: primaryParent.user.email,
    } : null,
    menu: formatMainMenu(parentName),
  });
}
