import { NextRequest, NextResponse } from "next/server";
import { SCHOOL } from "./constants";

/**
 * Shared-secret auth for n8n → Next.js calls.
 *
 * n8n must send one of:
 *   - Header `Authorization: Bearer <WHATSAPP_WEBHOOK_SECRET>`
 *   - Header `x-webhook-secret: <WHATSAPP_WEBHOOK_SECRET>`
 *
 * Returns null on success, or a 401 NextResponse to short-circuit the route.
 *
 * In dev (no secret configured) the check is bypassed with a console warning
 * so local exploration with curl/Postman still works.
 */
export function authorizeWebhook(req: NextRequest): NextResponse | null {
  const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("[whatsapp] WHATSAPP_WEBHOOK_SECRET not set — denying request");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    console.warn("[whatsapp] no WHATSAPP_WEBHOOK_SECRET in env — bypassing auth (dev only)");
    return null;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const direct = req.headers.get("x-webhook-secret");
  const provided = bearer ?? direct;

  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ============================================================
// Message formatters — return plain strings ready to send via
// WhatsApp Cloud API. Keep them short (WhatsApp message bubbles
// get truncated past ~1000 chars on most clients).
// ============================================================

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export function formatMainMenu(parentName: string) {
  return [
    `Hello ${parentName}, welcome to ${SCHOOL.shortName}! How can we help you today?`,
    "",
    "1️⃣  Check Result",
    "2️⃣  Check Attendance",
    "3️⃣  Check Fee Balance",
    "4️⃣  School Announcements",
    "5️⃣  Speak to Admin",
    "0️⃣  Exit",
    "",
    `Reply with the number of your choice.`,
  ].join("\n");
}

export function formatResults(input: {
  studentName: string;
  className: string;
  term: string;
  sessionName: string;
  position?: number | null;
  classSize?: number;
  results: { subject: string; total: number; grade?: string | null }[];
}) {
  const lines: string[] = [];
  const termLabel = input.term.charAt(0) + input.term.slice(1).toLowerCase();
  lines.push(`📊 *${input.studentName} — ${termLabel} Term Results*`);
  lines.push(`Session: ${input.sessionName} | Class: ${input.className}`);
  lines.push("");
  if (input.results.length === 0) {
    lines.push("No published results for this term yet.");
  } else {
    for (const r of input.results) {
      lines.push(`${r.subject}: ${r.total}${r.grade ? ` — ${r.grade}` : ""}`);
    }
    if (input.results.length > 0) {
      const avg = Math.round(input.results.reduce((s, r) => s + r.total, 0) / input.results.length * 10) / 10;
      lines.push("");
      lines.push(`*Term Average: ${avg}%*`);
      if (input.position) {
        lines.push(`*Position: ${ordinal(input.position)}${input.classSize ? ` out of ${input.classSize}` : ""}*`);
      }
    }
  }
  lines.push("");
  lines.push("For full result slip, log in: " + SCHOOL.website + "/portal/login");
  return lines.join("\n");
}

export function formatAttendance(input: {
  studentName: string;
  termLabel: string;
  sessionName: string;
  present: number;
  absent: number;
  late: number;
}) {
  const total = input.present + input.absent + input.late;
  const rate = total > 0 ? Math.round((input.present / total) * 1000) / 10 : 0;
  return [
    `📅 *Attendance Summary — ${input.studentName}*`,
    `Term: ${input.termLabel} | Session: ${input.sessionName}`,
    "",
    `Days Present: ${input.present}`,
    `Days Absent:  ${input.absent}`,
    `Days Late:    ${input.late}`,
    `Attendance Rate: ${rate}%`,
  ].join("\n");
}

export function formatFees(input: {
  studentName: string;
  fees: { feeType: string; amount: number; amountPaid: number; balance: number; status: string }[];
}) {
  const lines = [`💰 *Fee Status — ${input.studentName}*`, ""];
  if (input.fees.length === 0) {
    lines.push("No fee charges on record.");
  } else {
    let totalBilled = 0;
    let totalPaid = 0;
    for (const f of input.fees) {
      totalBilled += f.amount;
      totalPaid += f.amountPaid;
      const mark = f.status === "PAID" ? "✅" : f.status === "PARTIAL" ? "⚠️" : "❌";
      lines.push(`${f.feeType}: ${nairaFmt.format(f.amount)} — ${mark} ${f.status}`);
    }
    const outstanding = Math.max(0, totalBilled - totalPaid);
    lines.push("");
    lines.push(`*Total Outstanding: ${nairaFmt.format(outstanding)}*`);
    if (outstanding > 0) {
      lines.push("Pay online: " + SCHOOL.website + "/portal/login");
    }
    lines.push(`Or call: ${SCHOOL.phone}`);
  }
  return lines.join("\n");
}

export function formatAnnouncements(
  items: { title: string; body: string; publishedAt: Date | null }[],
) {
  if (items.length === 0) return "No announcements at the moment. Check back soon.";
  const lines = ["📢 *Latest from Meclones College Lekki*", ""];
  for (const a of items) {
    lines.push(`*${a.title}*${a.publishedAt ? ` (${dateFmt.format(a.publishedAt)})` : ""}`);
    lines.push(a.body.length > 200 ? a.body.slice(0, 200).trim() + "…" : a.body);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
