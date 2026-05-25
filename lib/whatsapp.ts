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
  return formatParentMenu({ parentName, currentChildName: null, hasMultipleChildren: false });
}

export function formatParentMenu(input: {
  parentName: string;
  currentChildName: string | null;
  hasMultipleChildren: boolean;
}) {
  const childLine = input.currentChildName
    ? `Currently viewing: *${input.currentChildName}*`
    : null;
  const lines = [
    `Hello ${input.parentName}, welcome back to ${SCHOOL.shortName}.`,
  ];
  if (childLine) lines.push(childLine);
  lines.push("", "What would you like to do?", "");
  lines.push("1️⃣  Check results");
  lines.push("2️⃣  Check attendance");
  lines.push("3️⃣  Fees & make payment");
  lines.push("4️⃣  Class timetable");
  lines.push("5️⃣  School announcements");
  if (input.hasMultipleChildren) lines.push("6️⃣  Switch to another child");
  lines.push("9️⃣  Speak to a staff member");
  lines.push("0️⃣  Exit");
  lines.push("", "Reply with the number of your choice.");
  return lines.join("\n");
}

export function formatTeacherMenu(teacherName: string) {
  return [
    `Hello ${teacherName}, ${SCHOOL.shortName} staff line.`,
    "",
    "What can I help you with?",
    "",
    "1️⃣  My classes",
    "2️⃣  Today's schedule",
    "3️⃣  Recent disciplinary cases (my classes)",
    "4️⃣  School announcements",
    "9️⃣  Speak to admin office",
    "0️⃣  Exit",
    "",
    "Reply with the number of your choice.",
  ].join("\n");
}

export function formatChildPicker(children: { admissionNumber: string; name: string; className: string }[]) {
  const lines = ["You have multiple children registered. Which one?", ""];
  children.forEach((c, i) => {
    lines.push(`${i + 1}. *${c.name}* — ${c.className} (${c.admissionNumber})`);
  });
  lines.push("", "Reply with the number of the child.");
  return lines.join("\n");
}

export function formatTimetable(input: {
  studentName: string;
  className: string;
  byDay: Record<string, Array<{ period: number; subject: string; teacher: string | null; startTime: string | null; endTime: string | null; note: string | null }>>;
}) {
  const lines = [`📅 *${input.studentName} — ${input.className} timetable*`, ""];
  const DAYS: Array<{ key: string; label: string }> = [
    { key: "MON", label: "Monday" },
    { key: "TUE", label: "Tuesday" },
    { key: "WED", label: "Wednesday" },
    { key: "THU", label: "Thursday" },
    { key: "FRI", label: "Friday" },
  ];
  let any = false;
  for (const d of DAYS) {
    const periods = input.byDay[d.key] ?? [];
    if (periods.length === 0) continue;
    any = true;
    lines.push(`*${d.label}*`);
    for (const p of periods) {
      const time = p.startTime && p.endTime ? ` (${p.startTime}-${p.endTime})` : "";
      const sub = p.subject || p.note || "—";
      lines.push(`  ${p.period}. ${sub}${time}${p.teacher ? ` · ${p.teacher}` : ""}`);
    }
    lines.push("");
  }
  if (!any) lines.push("No timetable set for this class yet — check back later.");
  return lines.join("\n").trim();
}

export function formatPayPrompt(input: {
  studentName: string;
  totalOutstanding: number;
  links: Array<{ feeType: string; amount: number; balance: number; url: string }>;
  portalUrl: string;
}) {
  const lines = [
    `💳 *Pay fees for ${input.studentName}*`,
    `Total outstanding: *${nairaFmt.format(input.totalOutstanding)}*`,
    "",
  ];
  if (input.links.length === 0) {
    lines.push("Nothing outstanding — every fee is paid up. 🎉");
    return lines.join("\n");
  }
  lines.push("Tap any link to pay that fee via Paystack:");
  input.links.forEach((l, i) => {
    lines.push("");
    lines.push(`${i + 1}. *${l.feeType}* — ${nairaFmt.format(l.balance)}`);
    lines.push(`   ${l.url}`);
  });
  lines.push("");
  lines.push("Or pay any custom amount in the portal:");
  lines.push(input.portalUrl);
  return lines.join("\n");
}

export function formatTeacherClasses(input: {
  teacherName: string;
  formOf: Array<{ name: string; arm: string; studentCount: number }>;
  teaching: Array<{ name: string; arm: string; subjects: string[] }>;
}) {
  const lines = [`👩‍🏫 *${input.teacherName} — your classes*`, ""];
  if (input.formOf.length > 0) {
    lines.push("*Form teacher of:*");
    for (const c of input.formOf) {
      lines.push(`  • ${c.name}${c.arm} (${c.studentCount} students)`);
    }
    lines.push("");
  }
  if (input.teaching.length > 0) {
    lines.push("*Subject teaching:*");
    for (const c of input.teaching) {
      lines.push(`  • ${c.name}${c.arm}${c.subjects.length > 0 ? ` — ${c.subjects.join(", ")}` : ""}`);
    }
  }
  if (input.formOf.length === 0 && input.teaching.length === 0) {
    lines.push("You're not assigned to any class yet. Talk to the admin office.");
  }
  return lines.join("\n");
}

export function formatTeacherSchedule(input: {
  teacherName: string;
  dayLabel: string;
  periods: Array<{ period: number; className: string; subject: string; startTime: string | null; endTime: string | null; room: string | null }>;
}) {
  const lines = [`⏰ *${input.teacherName} — ${input.dayLabel}*`, ""];
  if (input.periods.length === 0) {
    lines.push("No periods scheduled today. 🌞");
  } else {
    for (const p of input.periods) {
      const time = p.startTime && p.endTime ? `${p.startTime}-${p.endTime}` : `Period ${p.period}`;
      const room = p.room ? ` · Room ${p.room}` : "";
      lines.push(`${time}  ${p.subject} — ${p.className}${room}`);
    }
  }
  return lines.join("\n");
}

export function formatRecentDiscipline(cases: Array<{
  studentName: string;
  className: string;
  category: string;
  severity: string;
  status: string;
  date: Date;
}>) {
  if (cases.length === 0) {
    return "🎉 *Clean.* No open disciplinary cases for your classes right now.";
  }
  const lines = [`🛡️ *Recent disciplinary cases — your classes*`, ""];
  for (const c of cases) {
    const dateLabel = dateFmt.format(c.date);
    lines.push(`• ${c.studentName} (${c.className}) — ${c.category.replace(/_/g, " ").toLowerCase()}`);
    lines.push(`  ${c.severity.toLowerCase()} · ${c.status.toLowerCase()} · ${dateLabel}`);
  }
  lines.push("");
  lines.push("Full detail in the portal: " + SCHOOL.website + "/portal/teacher/discipline");
  return lines.join("\n");
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
