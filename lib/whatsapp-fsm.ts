/**
 * Finite-state machine for the school's WhatsApp parent bot.
 *
 * State lives on WhatsAppSession.lastMenu (just a string label) so we
 * can move forward without yet another DB column. The FSM is small and
 * intentionally readable rather than abstract.
 *
 * Flow:
 *   AUTH_PENDING  → expects admission number, e.g. "MCL/SS3A/2526/001"
 *   MAIN_MENU     → 1..5 + 0 to exit
 *   AWAIT_TERM    → expects 1/2/3 after picking Results
 *   ESCALATED     → human has been pinged; bot stays silent until reset
 *
 * Any input "menu", "0" or "exit" returns to MAIN_MENU (if authed) or to
 * AUTH_PENDING (if not).
 */

import { prisma } from "./prisma";
import { auditLog } from "./audit";
import { notify } from "./notify";
import {
  formatMainMenu,
  formatResults,
  formatAttendance,
  formatFees,
  formatAnnouncements,
} from "./whatsapp";
import { SCHOOL } from "./constants";

type Outbound = { body: string };

export interface FsmInput {
  /** Sender's WhatsApp phone (E.164 digits, no plus). */
  from: string;
  /** Raw text body the user sent. */
  text: string;
}

export interface FsmResult {
  /** Messages to send back, in order. */
  outbox: Outbound[];
  /** Session id we touched / created, useful for logging. */
  sessionId: string;
}

const RESET_TOKENS = new Set(["menu", "main", "0", "exit", "back", "cancel"]);

/**
 * Resolve or create the WhatsApp session for this phone. Sessions are
 * effectively 1-to-1 with a phone number; we reuse the most-recent one
 * so context (auth, last menu, escalation) persists across messages.
 */
async function getSession(phone: string) {
  const existing = await prisma.whatsAppSession.findFirst({
    where: { phoneNumber: phone },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    // Touch activity so the admin portal shows it as live.
    return prisma.whatsAppSession.update({
      where: { id: existing.id },
      data: { lastActivity: new Date() },
    });
  }
  return prisma.whatsAppSession.create({
    data: { phoneNumber: phone, lastMenu: "AUTH_PENDING" },
  });
}

async function logInbound(sessionId: string, content: string) {
  await prisma.whatsAppMessage.create({
    data: { sessionId, direction: "IN", content },
  }).catch(err => console.error("[whatsapp-fsm] log IN failed", err));
}

const TERM_MAP: Record<string, "FIRST" | "SECOND" | "THIRD"> = {
  "1": "FIRST", "first": "FIRST",
  "2": "SECOND", "second": "SECOND",
  "3": "THIRD", "third": "THIRD",
};

async function loadStudentContext(studentId: string) {
  return prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      classRef: { select: { name: true, arm: true } },
    },
  });
}

/**
 * Main entry. Pure-ish: takes input + state, returns outbox + persists.
 */
export async function handleIncoming({ from, text }: FsmInput): Promise<FsmResult> {
  let session = await getSession(from);
  await logInbound(session.id, text);

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const outbox: Outbound[] = [];

  // Global reset.
  if (RESET_TOKENS.has(lower)) {
    const nextMenu = session.studentId ? "MAIN_MENU" : "AUTH_PENDING";
    session = await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: { lastMenu: nextMenu, isEscalated: false, escalatedAt: null },
    });
    if (nextMenu === "AUTH_PENDING") {
      outbox.push({ body: welcomeNeedAdmission() });
    } else {
      const student = session.studentId ? await loadStudentContext(session.studentId) : null;
      const name = student?.user.name?.split(" ")[0] ?? "there";
      outbox.push({ body: formatMainMenu(name) });
    }
    return { outbox, sessionId: session.id };
  }

  // Escalated sessions are radio-silent until the parent says "menu".
  if (session.isEscalated) {
    outbox.push({
      body: `A staff member will respond shortly. Reply *menu* to come back to the bot instead. Or call us on ${SCHOOL.phone}.`,
    });
    return { outbox, sessionId: session.id };
  }

  switch (session.lastMenu) {
    case "AUTH_PENDING":
    case null:
    case "":
      await handleAuth(session.id, trimmed, outbox);
      break;

    case "MAIN_MENU":
      await handleMainMenu(session.id, session.studentId, trimmed, outbox);
      break;

    case "AWAIT_TERM":
      await handleTermPick(session.id, session.studentId, trimmed, outbox);
      break;

    default:
      // Unknown state — coerce back to main menu (or auth).
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { lastMenu: session.studentId ? "MAIN_MENU" : "AUTH_PENDING" },
      });
      outbox.push({
        body: session.studentId
          ? formatMainMenu((await loadStudentContext(session.studentId))?.user.name.split(" ")[0] ?? "there")
          : welcomeNeedAdmission(),
      });
  }

  return { outbox, sessionId: session.id };
}

function welcomeNeedAdmission() {
  return [
    `Hello, welcome to ${SCHOOL.name}.`,
    "",
    "Please reply with your child's *admission number* to continue. Example: MCL/SS3A/2526/001",
    "",
    `Or reply *5* to speak to a staff member. Or call ${SCHOOL.phone}.`,
  ].join("\n");
}

async function handleAuth(sessionId: string, input: string, outbox: Outbound[]) {
  // Quick-escalate from the auth screen.
  if (input === "5" || /^speak|talk|admin|human|help/i.test(input)) {
    await escalateSession(sessionId, "User requested human at auth", outbox);
    return;
  }

  const admissionNumber = input.toUpperCase().replace(/\s+/g, "");
  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      user: { select: { name: true } },
      classRef: { select: { name: true, arm: true } },
      parentLinks: { include: { parent: { include: { user: { select: { name: true } } } } } },
    },
  });

  if (!student) {
    outbox.push({
      body: `Sorry, I couldn't find a student with that admission number. Please check the format (e.g. MCL/SS3A/2526/001) and try again, or reply *5* to talk to a person.`,
    });
    return;
  }

  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: {
      studentId: student.id,
      lastMenu: "MAIN_MENU",
      admissionNumber,
      userId: student.parentLinks[0]?.parent.userId ?? null,
    },
  });

  const greeting = student.parentLinks[0]?.parent.user.name?.split(" ")[0]
    ?? student.user.name.split(" ")[0];
  outbox.push({
    body: `Got it — found *${student.user.name}*${student.classRef ? ` (${student.classRef.name}${student.classRef.arm})` : ""}.`,
  });
  outbox.push({ body: formatMainMenu(greeting) });
}

async function handleMainMenu(
  sessionId: string,
  studentId: string | null,
  input: string,
  outbox: Outbound[],
) {
  if (!studentId) {
    await prisma.whatsAppSession.update({ where: { id: sessionId }, data: { lastMenu: "AUTH_PENDING" } });
    outbox.push({ body: welcomeNeedAdmission() });
    return;
  }
  const choice = input.trim();

  if (choice === "1") {
    await prisma.whatsAppSession.update({ where: { id: sessionId }, data: { lastMenu: "AWAIT_TERM" } });
    outbox.push({
      body: "Which term's results?\n\n1️⃣ First Term\n2️⃣ Second Term\n3️⃣ Third Term\n\nReply with the number.",
    });
    return;
  }

  if (choice === "2") {
    await sendAttendance(studentId, outbox);
    outbox.push({ body: backToMenuHint() });
    return;
  }

  if (choice === "3") {
    await sendFees(studentId, outbox);
    outbox.push({ body: backToMenuHint() });
    return;
  }

  if (choice === "4") {
    await sendAnnouncements(outbox);
    outbox.push({ body: backToMenuHint() });
    return;
  }

  if (choice === "5") {
    await escalateSession(sessionId, "User picked 'Speak to Admin'", outbox);
    return;
  }

  if (choice === "0" || /^(exit|bye|thanks|thank you)/i.test(choice)) {
    outbox.push({ body: "👋 Thanks for using Meclones College Lekki. Reply *menu* any time to come back." });
    return;
  }

  outbox.push({ body: "Sorry, I didn't catch that. Please reply with 1, 2, 3, 4, 5 or 0." });
}

async function handleTermPick(
  sessionId: string,
  studentId: string | null,
  input: string,
  outbox: Outbound[],
) {
  if (!studentId) {
    await prisma.whatsAppSession.update({ where: { id: sessionId }, data: { lastMenu: "AUTH_PENDING" } });
    outbox.push({ body: welcomeNeedAdmission() });
    return;
  }
  const term = TERM_MAP[input.trim().toLowerCase()];
  if (!term) {
    outbox.push({ body: "Please reply 1, 2 or 3 — for First, Second or Third term." });
    return;
  }
  await sendResults(studentId, term, outbox);
  await prisma.whatsAppSession.update({ where: { id: sessionId }, data: { lastMenu: "MAIN_MENU" } });
  outbox.push({ body: backToMenuHint() });
}

function backToMenuHint() {
  return "Reply *menu* to see options again, or *5* to talk to a person.";
}

async function escalateSession(sessionId: string, reason: string, outbox: Outbound[]) {
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { isEscalated: true, escalatedAt: new Date(), lastMenu: "ESCALATED" },
  });
  await auditLog({
    action: "whatsapp.escalate",
    targetType: "WhatsAppSession",
    targetId: sessionId,
    metadata: { reason },
  });

  // Bell-ping every active admin so someone can pick this up.
  const admins = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "DIRECTOR", "SUPER_ADMIN"] } },
    select: { id: true },
  });
  if (admins.length > 0) {
    notify({
      userIds: admins.map(a => a.id),
      type: "WHATSAPP_INCOMING",
      title: "WhatsApp escalation",
      body: reason,
      href: `/portal/whatsapp/${sessionId}`,
    }).catch(err => console.error("[whatsapp-fsm] notify failed", err));
  }

  outbox.push({
    body: `Got it — a staff member will reach out to you shortly. While you wait you can also call us on ${SCHOOL.phone}.`,
  });
}

async function sendResults(studentId: string, term: "FIRST" | "SECOND" | "THIRD", outbox: Outbound[]) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
  });
  if (!student) {
    outbox.push({ body: "Couldn't find that student record any more. Try *menu* to start over." });
    return;
  }

  const session = await prisma.academicSession.findFirst({ where: { isActive: true } });
  if (!session) {
    outbox.push({ body: "No active session yet — please check back later." });
    return;
  }
  const termRow = await prisma.term.findFirst({ where: { name: term, sessionId: session.id } });
  if (!termRow) {
    outbox.push({ body: `No ${term.toLowerCase()} term in the current session yet.` });
    return;
  }

  const results = await prisma.result.findMany({
    where: { studentId, termId: termRow.id, isPublished: true },
    include: { subject: { select: { name: true } } },
    orderBy: { subject: { name: "asc" } },
  });

  const position = results.find(r => r.position !== null)?.position ?? null;
  const classSize = student.classId ? await prisma.student.count({ where: { classId: student.classId } }) : undefined;

  outbox.push({
    body: formatResults({
      studentName: student.user.name,
      className: student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "—",
      term,
      sessionName: session.name,
      position: position ?? undefined,
      classSize,
      results: results.map(r => ({ subject: r.subject.name, total: r.total, grade: r.grade })),
    }),
  });
}

async function sendAttendance(studentId: string, outbox: Outbound[]) {
  const [student, session] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, include: { user: { select: { name: true } } } }),
    prisma.academicSession.findFirst({ where: { isActive: true } }),
  ]);
  if (!student) {
    outbox.push({ body: "Student record not found. Reply *menu* to start over." });
    return;
  }
  const term = await prisma.term.findFirst({ where: { isActive: true } });
  if (!term || !session) {
    outbox.push({ body: "No active term yet — check back later." });
    return;
  }

  const marks = await prisma.attendance.groupBy({
    by: ["status"],
    where: { studentId, termId: term.id },
    _count: { _all: true },
  });
  const present = marks.find(m => m.status === "PRESENT")?._count._all ?? 0;
  const absent = marks.find(m => m.status === "ABSENT")?._count._all ?? 0;
  const late = marks.find(m => m.status === "LATE")?._count._all ?? 0;

  outbox.push({
    body: formatAttendance({
      studentName: student.user.name,
      termLabel: term.name.charAt(0) + term.name.slice(1).toLowerCase(),
      sessionName: session.name,
      present, absent, late,
    }),
  });
}

async function sendFees(studentId: string, outbox: Outbound[]) {
  const [student, term] = await Promise.all([
    prisma.student.findUnique({ where: { id: studentId }, include: { user: { select: { name: true } } } }),
    prisma.term.findFirst({ where: { isActive: true } }),
  ]);
  if (!student) {
    outbox.push({ body: "Student record not found. Reply *menu* to start over." });
    return;
  }
  if (!term) {
    outbox.push({ body: "No active term yet — check back later." });
    return;
  }

  const fees = await prisma.fee.findMany({
    where: { studentId, termId: term.id },
    orderBy: { createdAt: "asc" },
  });

  outbox.push({
    body: formatFees({
      studentName: student.user.name,
      fees: fees.map(f => ({
        feeType: f.feeType,
        amount: Number(f.amount),
        amountPaid: Number(f.amountPaid),
        balance: Number(f.balance),
        status: f.status,
      })),
    }),
  });
}

async function sendAnnouncements(outbox: Outbound[]) {
  const items = await prisma.announcement.findMany({
    where: { OR: [{ audience: "ALL" }, { audience: "PARENTS" }], publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { title: true, body: true, publishedAt: true },
  });
  outbox.push({ body: formatAnnouncements(items) });
}

