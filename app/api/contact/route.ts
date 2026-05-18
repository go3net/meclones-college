import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendContactInquiry } from "@/lib/resend";

const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  subject: z.string().optional(),
  role: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

async function readPayload(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return req.json();
  }
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await readPayload(req);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject || null,
        role: data.role || null,
        message: data.message,
      },
    });
  } catch (err) {
    console.error("[contact] DB persist failed", err);
  }

  Promise.allSettled([sendContactInquiry(data)]).catch(err =>
    console.error("[contact] email send failed", err)
  );

  // If the request came from a plain HTML form, redirect back so the user
  // sees something meaningful even with JS disabled.
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/contact?sent=1", req.url), { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
