import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendAdmissionConfirmation, sendAdmissionsAlert } from "@/lib/resend";

const Schema = z.object({
  studentFirstName: z.string().min(1, "First name is required"),
  studentLastName: z.string().min(1, "Last name is required"),
  studentDob: z.string().optional(),
  studentGender: z.enum(["M", "F", ""]).optional(),
  classApplying: z.string().min(1, "Class is required"),
  previousSchool: z.string().optional(),
  parentName: z.string().min(1, "Parent name is required"),
  parentPhone: z.string().min(7, "Phone is required"),
  parentEmail: z.string().email("Valid email is required"),
  parentOccupation: z.string().optional(),
  homeAddress: z.string().optional(),
  notes: z.string().optional(),
});

function buildReference() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MEC/${year}/${rand}`;
}

function genderEnum(v: string | undefined): "MALE" | "FEMALE" | undefined {
  if (v === "M") return "MALE";
  if (v === "F") return "FEMALE";
  return undefined;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const applicantName = `${data.studentFirstName} ${data.studentLastName}`.trim();
  const reference = buildReference();

  // Persist (best effort — if DB isn't connected yet, we still return ref so the
  // form can show its success screen during deploy ramp-up).
  let persistedId: string | null = null;
  try {
    const created = await prisma.admission.create({
      data: {
        reference,
        applicantName,
        dob: data.studentDob ? new Date(data.studentDob) : null,
        gender: genderEnum(data.studentGender),
        classApplyingFor: data.classApplying,
        previousSchool: data.previousSchool || null,
        parentName: data.parentName,
        parentPhone: data.parentPhone,
        parentEmail: data.parentEmail,
        parentOccupation: data.parentOccupation || null,
        homeAddress: data.homeAddress || null,
        notes: data.notes || null,
      },
    });
    persistedId = created.id;
  } catch (err) {
    console.error("[admissions] DB persist failed", err);
  }

  // Fire-and-forget emails (don't block the response on email send)
  Promise.allSettled([
    sendAdmissionConfirmation({
      to: data.parentEmail,
      parentName: data.parentName,
      applicantName,
      reference,
      classApplyingFor: data.classApplying,
    }),
    sendAdmissionsAlert({
      applicantName,
      parentName: data.parentName,
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail,
      classApplyingFor: data.classApplying,
      reference,
    }),
  ]).catch(err => console.error("[admissions] email send failed", err));

  return NextResponse.json({ ok: true, reference, id: persistedId }, { status: 201 });
}
