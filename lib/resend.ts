import { Resend } from "resend";
import { SCHOOL } from "./constants";

// Lazy-init so missing API key doesn't crash builds. Email helpers degrade
// gracefully to console logs in dev without RESEND_API_KEY.

let _resend: Resend | null = null;
function client() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.RESEND_FROM ?? `${SCHOOL.shortName} <noreply@meclonescollege.com>`;

export async function sendAdmissionConfirmation(input: {
  to: string;
  parentName: string;
  applicantName: string;
  reference: string;
  classApplyingFor: string;
}) {
  const subject = `${SCHOOL.shortName} — Application received (${input.reference})`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <h2 style="color:#0B1F4B; font-family: Georgia, serif;">We've received your application</h2>
      <p>Dear ${input.parentName},</p>
      <p>Thank you for choosing <strong>${SCHOOL.name}</strong>. We have received your application for
        <strong>${input.applicantName}</strong> (${input.classApplyingFor}).</p>
      <p>Your reference number is:</p>
      <p style="font-size:22px; font-weight:700; color:#D4A017; letter-spacing:0.04em;">${input.reference}</p>
      <p>Our admissions team will be in touch within 24 hours to confirm next steps.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      <p style="font-size:13px; color:#475569;">
        ${SCHOOL.name}<br/>
        ${SCHOOL.address}<br/>
        ${SCHOOL.phone} · ${SCHOOL.email}
      </p>
    </div>
  `;

  const c = client();
  if (!c) {
    console.log("[resend stub] sendAdmissionConfirmation", { to: input.to, subject, reference: input.reference });
    return { id: "stub" };
  }
  const r = await c.emails.send({ from: FROM, to: input.to, subject, html });
  return r;
}

export async function sendAdmissionsAlert(input: {
  applicantName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  classApplyingFor: string;
  reference: string;
}) {
  const to = process.env.ADMISSIONS_NOTIFY_EMAIL ?? SCHOOL.admissionsEmail;
  const subject = `New admission application — ${input.applicantName} (${input.classApplyingFor})`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a;">
      <h2>New admission application</h2>
      <p><strong>Reference:</strong> ${input.reference}</p>
      <ul>
        <li><strong>Applicant:</strong> ${input.applicantName}</li>
        <li><strong>Class:</strong> ${input.classApplyingFor}</li>
        <li><strong>Parent/Guardian:</strong> ${input.parentName}</li>
        <li><strong>Phone:</strong> ${input.parentPhone}</li>
        <li><strong>Email:</strong> ${input.parentEmail}</li>
      </ul>
    </div>
  `;

  const c = client();
  if (!c) {
    console.log("[resend stub] sendAdmissionsAlert", { to, subject });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to, subject, html });
}

export async function sendContactInquiry(input: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  role?: string;
  message: string;
}) {
  const to = process.env.CONTACT_NOTIFY_EMAIL ?? SCHOOL.email;
  const subject = `Website enquiry — ${input.subject ?? input.role ?? input.name}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a;">
      <h2>New enquiry from the website</h2>
      <ul>
        <li><strong>Name:</strong> ${input.name}</li>
        <li><strong>Email:</strong> ${input.email}</li>
        ${input.phone ? `<li><strong>Phone:</strong> ${input.phone}</li>` : ""}
        ${input.role ? `<li><strong>I am a:</strong> ${input.role}</li>` : ""}
      </ul>
      <p style="white-space:pre-wrap;">${input.message}</p>
    </div>
  `;

  const c = client();
  if (!c) {
    console.log("[resend stub] sendContactInquiry", { to, subject });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to, subject, html, replyTo: input.email });
}
