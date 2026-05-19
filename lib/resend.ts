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

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateF = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

export async function sendPaymentReceipt(input: {
  to: string | string[];
  studentName: string;
  feeType: string;
  amountPaid: number;
  newBalance: number;
  reference: string;
  channel: string;
  paidAt: Date;
  paymentId: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website;
  const receiptUrl = `${siteUrl.replace(/\/$/, "")}/portal/parent/fees/receipt/${input.paymentId}`;
  const subject = `${SCHOOL.shortName} — Payment receipt for ${input.studentName} (${naira.format(input.amountPaid)})`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <div style="border-bottom:3px solid #0B1F4B; padding-bottom:12px; margin-bottom:20px;">
        <h2 style="color:#0B1F4B; font-family: Georgia, serif; margin:0;">${SCHOOL.name}</h2>
        <p style="font-size:12px; color:#5e3e17; font-weight:600; margin:4px 0 0;">${SCHOOL.tagline}</p>
      </div>

      <h3 style="color:#0B1F4B; font-family: Georgia, serif;">Payment received — thank you!</h3>
      <p>We've received your payment for <strong>${input.studentName}</strong>.</p>

      <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
        <tr><td style="padding:8px 0; color:#64748b;">Fee item</td><td style="text-align:right; font-weight:600;">${input.feeType}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b;">Amount paid</td><td style="text-align:right; font-weight:600; color:#047857;">${naira.format(input.amountPaid)}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b;">Balance remaining</td><td style="text-align:right; font-weight:600;">${naira.format(input.newBalance)}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b;">Reference</td><td style="text-align:right; font-family:monospace;">${input.reference}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b;">Channel</td><td style="text-align:right;">${input.channel}</td></tr>
        <tr><td style="padding:8px 0; color:#64748b;">Paid on</td><td style="text-align:right;">${dateF.format(input.paidAt)}</td></tr>
      </table>

      <p style="margin:24px 0;">
        <a href="${receiptUrl}" style="display:inline-block; background:#D4A017; color:#0B1F4B; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">View / print receipt</a>
      </p>

      <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
      <p style="font-size:12px; color:#64748b;">
        ${SCHOOL.name}<br/>${SCHOOL.address}<br/>${SCHOOL.phone} · ${SCHOOL.email}
      </p>
    </div>
  `;

  const c = client();
  if (!c) {
    console.log("[resend stub] sendPaymentReceipt", { to: input.to, subject, reference: input.reference });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to: input.to, subject, html });
}

// ============================================================
// Auth & portal notifications
// ============================================================

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const subject = `${SCHOOL.shortName} — Reset your password`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <h2 style="color:#0B1F4B; font-family: Georgia, serif;">Reset your password</h2>
      <p>Hello ${input.name},</p>
      <p>We received a request to reset your ${SCHOOL.shortName} portal password.
        Click the button below to set a new one — the link expires in 1 hour.</p>
      <p style="margin:24px 0;">
        <a href="${input.resetUrl}" style="display:inline-block; background:#D4A017; color:#0B1F4B; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">Reset password</a>
      </p>
      <p style="font-size:12px; color:#64748b;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      <p style="font-size:12px; color:#64748b;">
        ${SCHOOL.name} · ${SCHOOL.phone} · ${SCHOOL.email}
      </p>
    </div>
  `;
  const c = client();
  if (!c) {
    console.log("[resend stub] sendPasswordResetEmail", { to: input.to, resetUrl: input.resetUrl });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to: input.to, subject, html });
}

export async function sendResultsPublishedEmail(input: {
  to: string | string[];
  parentName: string;
  studentName: string;
  termLabel: string;
  classLabel: string;
  resultUrl: string;
}) {
  const subject = `${SCHOOL.shortName} — ${input.studentName}'s ${input.termLabel} results are out`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <h2 style="color:#0B1F4B; font-family: Georgia, serif;">${input.termLabel} results published</h2>
      <p>Dear ${input.parentName},</p>
      <p><strong>${input.studentName}</strong> (${input.classLabel})'s results for the ${input.termLabel} have been published on the portal.</p>
      <p style="margin:20px 0;">
        <a href="${input.resultUrl}" style="display:inline-block; background:#D4A017; color:#0B1F4B; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">View results</a>
      </p>
      <p style="font-size:13px; color:#475569;">You can also download a printable result slip from the same page.</p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      <p style="font-size:12px; color:#64748b;">${SCHOOL.name} · ${SCHOOL.phone} · ${SCHOOL.email}</p>
    </div>
  `;
  const c = client();
  if (!c) {
    console.log("[resend stub] sendResultsPublishedEmail", { to: input.to, student: input.studentName });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to: input.to, subject, html });
}

export async function sendComplaintRepliedEmail(input: {
  to: string;
  parentName: string;
  subject: string;
  resolution: string;
  portalUrl: string;
}) {
  const emailSubject = `${SCHOOL.shortName} — Re: ${input.subject}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <h2 style="color:#0B1F4B; font-family: Georgia, serif;">Your complaint has been resolved</h2>
      <p>Dear ${input.parentName},</p>
      <p>The school has reviewed and responded to your complaint:</p>
      <p style="font-size:14px; color:#475569;"><em>"${input.subject}"</em></p>
      <div style="background:#ecfdf5; border-left:3px solid #10b981; padding:12px 16px; border-radius:4px; margin:16px 0;">
        <p style="margin:0; font-size:13px; color:#065f46;">${input.resolution}</p>
      </div>
      <p style="margin:20px 0;">
        <a href="${input.portalUrl}" style="display:inline-block; background:#D4A017; color:#0B1F4B; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">View in portal</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      <p style="font-size:12px; color:#64748b;">${SCHOOL.name} · ${SCHOOL.phone} · ${SCHOOL.email}</p>
    </div>
  `;
  const c = client();
  if (!c) {
    console.log("[resend stub] sendComplaintRepliedEmail", { to: input.to });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to: input.to, subject: emailSubject, html });
}

export async function sendFeeChargedEmail(input: {
  to: string;
  parentName: string;
  studentName: string;
  feeType: string;
  amount: number;
  dueDate: Date | null;
  portalUrl: string;
}) {
  const emailSubject = `${SCHOOL.shortName} — New fee charged for ${input.studentName}: ${naira.format(input.amount)}`;
  const dueLine = input.dueDate
    ? `<p>Due by <strong>${dateF.format(input.dueDate)}</strong>.</p>`
    : "";
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1a2c5a; max-width:560px; margin:0 auto; padding:24px;">
      <h2 style="color:#0B1F4B; font-family: Georgia, serif;">New fee charged</h2>
      <p>Dear ${input.parentName},</p>
      <p>A new fee has been added to <strong>${input.studentName}</strong>'s account:</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:14px;">
        <tr><td style="padding:6px 0; color:#64748b;">Fee item</td><td style="text-align:right; font-weight:600;">${input.feeType}</td></tr>
        <tr><td style="padding:6px 0; color:#64748b;">Amount</td><td style="text-align:right; font-weight:600; color:#0B1F4B;">${naira.format(input.amount)}</td></tr>
      </table>
      ${dueLine}
      <p style="margin:20px 0;">
        <a href="${input.portalUrl}" style="display:inline-block; background:#D4A017; color:#0B1F4B; padding:10px 20px; border-radius:6px; text-decoration:none; font-weight:600;">Pay now / view balance</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0;" />
      <p style="font-size:12px; color:#64748b;">${SCHOOL.name} · ${SCHOOL.phone} · ${SCHOOL.email}</p>
    </div>
  `;
  const c = client();
  if (!c) {
    console.log("[resend stub] sendFeeChargedEmail", { to: input.to, amount: input.amount });
    return { id: "stub" };
  }
  return c.emails.send({ from: FROM, to: input.to, subject: emailSubject, html });
}
