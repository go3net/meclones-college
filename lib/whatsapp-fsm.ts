/**
 * Finite-state machine for the school's WhatsApp bot. Handles three
 * user classes:
 *
 *   PARENT  — auto-authenticated by their WhatsApp phone number matching
 *             User.phone. If not found, falls back to admission-number
 *             prompt for unregistered parents.
 *   TEACHER — auto-authenticated by phone-number lookup.
 *   GUEST   — neither match; prompts for admission number.
 *
 * State lives on WhatsAppSession.lastMenu. Sessions are reused per phone
 * so context persists across messages.
 *
 * Flow labels:
 *   AUTH_PENDING  → guest expects admission number
 *   CHOOSE_CHILD  → multi-child parent expects a number 1..N
 *   PARENT_MENU   → main menu
 *   TEACHER_MENU  → staff main menu
 *   AWAIT_TERM    → after Results, expects 1/2/3 for term
 *   ESCALATED     → human has been pinged; bot silent until parent says "menu"
 *
 * Any input "menu", "0" or "exit" returns to the right menu (or AUTH_PENDING
 * when not authed).
 */

import { prisma } from "./prisma";
import { auditLog } from "./audit";
import { notify } from "./notify";
import {
  formatParentMenu,
  formatTeacherMenu,
  formatChildPicker,
  formatResults,
  formatAttendance,
  formatFees,
  formatPayPrompt,
  formatTimetable,
  formatAnnouncements,
  formatTeacherClasses,
  formatTeacherSchedule,
  formatRecentDiscipline,
} from "./whatsapp";
import { initTransaction, nairaToKobo } from "./paystack";
import { normaliseNgPhone } from "./whatsapp-cloud";
import { SCHOOL } from "./constants";

type Outbound = { body: string };

export interface FsmInput {
  /** Sender's WhatsApp phone (E.164 digits, no plus). */
  from: string;
  /** Raw text body the user sent. */
  text: string;
}

export interface FsmResult {
  outbox: Outbound[];
  sessionId: string;
}

const RESET_TOKENS = new Set(["menu", "main", "0", "exit", "back", "cancel"]);
const STAFF_REQUEST = /^(9|admin|staff|help|human|speak|talk)/i;

const TERM_MAP: Record<string, "FIRST" | "SECOND" | "THIRD"> = {
  "1": "FIRST", "first": "FIRST",
  "2": "SECOND", "second": "SECOND",
  "3": "THIRD", "third": "THIRD",
};

const DAY_NAMES: Record<number, "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN"> = {
  0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT",
};

// ─── Session helpers ────────────────────────────────────────────────

async function getSession(phone: string) {
  const existing = await prisma.whatsAppSession.findFirst({
    where: { phoneNumber: phone },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
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

/**
 * Try to find a User whose phone matches the WhatsApp sender. Phones in
 * the DB might be stored with or without country code; normalise both
 * sides to digits-only and compare.
 */
async function lookupByPhone(rawPhone: string) {
  const normalised = normaliseNgPhone(rawPhone);
  // Try several variants — the DB might store "+234..." / "234..." / "0...".
  const candidates = [
    normalised,
    "+" + normalised,
    "0" + normalised.replace(/^234/, ""),
  ];
  // We can't easily do a regex match in Prisma without raw SQL, so fetch
  // users with any phone set and post-filter. The school's User table is
  // small enough (~hundreds) that this is cheap.
  const allUsers = await prisma.user.findMany({
    where: { phone: { not: null }, isActive: true },
    select: { id: true, name: true, email: true, role: true, phone: true },
  });
  for (const u of allUsers) {
    if (!u.phone) continue;
    const userDigits = normaliseNgPhone(u.phone);
    if (candidates.includes(userDigits) || candidates.includes(u.phone)) {
      return u;
    }
  }
  return null;
}

async function loadChildren(parentUserId: string) {
  const parent = await prisma.parent.findUnique({
    where: { userId: parentUserId },
    include: {
      children: {
        where: { student: { graduatedAt: null } },
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              classRef: { select: { name: true, arm: true } },
            },
          },
        },
      },
    },
  });
  return parent?.children.map(c => c.student) ?? [];
}

// ─── Main entry ──────────────────────────────────────────────────────

export async function handleIncoming({ from, text }: FsmInput): Promise<FsmResult> {
  let session = await getSession(from);
  await logInbound(session.id, text);

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const outbox: Outbound[] = [];

  // Global reset.
  if (RESET_TOKENS.has(lower)) {
    return resetSession(session.id, from, outbox);
  }

  // Escalated → silent except for the "still escalated" notice.
  if (session.isEscalated) {
    outbox.push({
      body: `A staff member will respond shortly. Reply *menu* to come back to the bot, or call ${SCHOOL.phone}.`,
    });
    return { outbox, sessionId: session.id };
  }

  // First-time visitor: try phone-based auto-auth.
  if (!session.userId && !session.studentId) {
    const user = await lookupByPhone(from);
    if (user) {
      if (user.role === "TEACHER") {
        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { userId: user.id, lastMenu: "TEACHER_MENU" },
        });
        outbox.push({ body: formatTeacherMenu(user.name.split(" ")[0]) });
        return { outbox, sessionId: session.id };
      }
      if (user.role === "PARENT") {
        const children = await loadChildren(user.id);
        if (children.length === 0) {
          outbox.push({
            body: `Hello ${user.name.split(" ")[0]}, your account isn't linked to any active student yet. Please call ${SCHOOL.phone}.`,
          });
          return { outbox, sessionId: session.id };
        }
        if (children.length === 1) {
          await prisma.whatsAppSession.update({
            where: { id: session.id },
            data: { userId: user.id, studentId: children[0].id, admissionNumber: children[0].admissionNumber, lastMenu: "PARENT_MENU" },
          });
          outbox.push({
            body: formatParentMenu({
              parentName: user.name.split(" ")[0],
              currentChildName: children[0].user.name,
              hasMultipleChildren: false,
            }),
          });
          return { outbox, sessionId: session.id };
        }
        // Multi-child: ask to pick.
        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: { userId: user.id, lastMenu: "CHOOSE_CHILD" },
        });
        outbox.push({
          body: `Welcome ${user.name.split(" ")[0]}!`,
        });
        outbox.push({
          body: formatChildPicker(children.map(c => ({
            admissionNumber: c.admissionNumber,
            name: c.user.name,
            className: c.classRef ? `${c.classRef.name}${c.classRef.arm}` : "Unassigned",
          }))),
        });
        return { outbox, sessionId: session.id };
      }
      // Other roles (admin/director/etc) — bounce to staff line via escalation.
      outbox.push({
        body: `Hello ${user.name.split(" ")[0]}, the WhatsApp bot is for parents and teachers. For admin tools please use the portal: ${SCHOOL.website}/portal/login`,
      });
      return { outbox, sessionId: session.id };
    }
    // No phone match → guest flow.
    outbox.push({ body: welcomeGuest() });
    return { outbox, sessionId: session.id };
  }

  // Quick-escalate shortcut at any menu.
  if (STAFF_REQUEST.test(trimmed)) {
    await escalateSession(session.id, "User asked for human at " + (session.lastMenu ?? "unknown"), outbox);
    return { outbox, sessionId: session.id };
  }

  // Dispatch on state.
  switch (session.lastMenu) {
    case "AUTH_PENDING":
    case null:
    case "":
      await handleGuestAuth(session.id, trimmed, outbox);
      break;
    case "CHOOSE_CHILD":
      await handleChooseChild(session, trimmed, outbox);
      break;
    case "PARENT_MENU":
      await handleParentMenu(session, trimmed, outbox);
      break;
    case "TEACHER_MENU":
      await handleTeacherMenu(session, trimmed, outbox);
      break;
    case "AWAIT_TERM":
      await handleTermPick(session, trimmed, outbox);
      break;
    default:
      // Unknown state — coerce back.
      await resetSession(session.id, from, outbox);
  }

  return { outbox, sessionId: session.id };
}

// ─── Reset / welcome ────────────────────────────────────────────────

async function resetSession(sessionId: string, phone: string, outbox: Outbound[]): Promise<FsmResult> {
  const session = await prisma.whatsAppSession.findUnique({ where: { id: sessionId } });
  if (!session) return { outbox, sessionId };

  // If already authed, drop into the right menu.
  if (session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, role: true },
    });
    if (user?.role === "TEACHER") {
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { lastMenu: "TEACHER_MENU", isEscalated: false, escalatedAt: null },
      });
      outbox.push({ body: formatTeacherMenu(user.name.split(" ")[0]) });
      return { outbox, sessionId: session.id };
    }
    if (user?.role === "PARENT") {
      const children = await loadChildren(session.userId);
      const current = children.find(c => c.id === session.studentId) ?? children[0] ?? null;
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          lastMenu: "PARENT_MENU",
          isEscalated: false,
          escalatedAt: null,
          studentId: current?.id ?? null,
        },
      });
      outbox.push({
        body: formatParentMenu({
          parentName: user.name.split(" ")[0],
          currentChildName: current?.user.name ?? null,
          hasMultipleChildren: children.length > 1,
        }),
      });
      return { outbox, sessionId: session.id };
    }
  }
  // Not authed → try phone lookup again or send guest welcome.
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "AUTH_PENDING", isEscalated: false, escalatedAt: null },
  });
  outbox.push({ body: welcomeGuest() });
  return { outbox, sessionId: session.id };
}

function welcomeGuest() {
  return [
    `Hello, welcome to ${SCHOOL.name}.`,
    "",
    "If you're a *parent* and your phone is linked, you'll be auto-recognised next time. For now, please reply with your child's *admission number* to continue.",
    "",
    "Example: MCL/SS3A/2526/001",
    "",
    `Or reply *9* to speak to a staff member. Or call ${SCHOOL.phone}.`,
  ].join("\n");
}

// ─── Guest admission-number flow ────────────────────────────────────

async function handleGuestAuth(sessionId: string, input: string, outbox: Outbound[]) {
  const admissionNumber = input.toUpperCase().replace(/\s+/g, "");
  const student = await prisma.student.findUnique({
    where: { admissionNumber },
    include: {
      user: { select: { name: true } },
      classRef: { select: { name: true, arm: true } },
      parentLinks: { include: { parent: { include: { user: { select: { id: true, name: true } } } } } },
    },
  });

  if (!student) {
    outbox.push({
      body: `Sorry, I couldn't find a student with that admission number. Please check (e.g. MCL/SS3A/2526/001) and try again, or reply *9* for a person.`,
    });
    return;
  }

  // Bind to the student + first linked parent (if any).
  const parentUserId = student.parentLinks[0]?.parent.user.id ?? null;
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: {
      studentId: student.id,
      admissionNumber,
      userId: parentUserId,
      lastMenu: "PARENT_MENU",
    },
  });

  const greetName = student.parentLinks[0]?.parent.user.name?.split(" ")[0]
    ?? student.user.name.split(" ")[0];
  outbox.push({
    body: `Got it — found *${student.user.name}*${student.classRef ? ` (${student.classRef.name}${student.classRef.arm})` : ""}.`,
  });
  outbox.push({
    body: formatParentMenu({
      parentName: greetName,
      currentChildName: student.user.name,
      hasMultipleChildren: false,
    }),
  });
}

// ─── Multi-child picker ─────────────────────────────────────────────

async function handleChooseChild(
  session: { id: string; userId: string | null },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) {
    outbox.push({ body: welcomeGuest() });
    return;
  }
  const idx = Number(input.trim()) - 1;
  const children = await loadChildren(session.userId);
  if (!Number.isInteger(idx) || idx < 0 || idx >= children.length) {
    outbox.push({
      body: `Please reply with a number from 1 to ${children.length}.`,
    });
    return;
  }
  const chosen = children[idx];
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { studentId: chosen.id, admissionNumber: chosen.admissionNumber, lastMenu: "PARENT_MENU" },
  });
  const parentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  outbox.push({
    body: formatParentMenu({
      parentName: parentUser?.name.split(" ")[0] ?? "there",
      currentChildName: chosen.user.name,
      hasMultipleChildren: children.length > 1,
    }),
  });
}

// ─── Parent menu ────────────────────────────────────────────────────

async function handleParentMenu(
  session: { id: string; userId: string | null; studentId: string | null },
  input: string,
  outbox: Outbound[],
) {
  if (!session.studentId) {
    outbox.push({ body: welcomeGuest() });
    return;
  }
  const choice = input.trim().toLowerCase();

  if (choice === "1") {
    await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: { lastMenu: "AWAIT_TERM" },
    });
    outbox.push({
      body: "Which term's results?\n\n1️⃣  First Term\n2️⃣  Second Term\n3️⃣  Third Term\n\nReply with the number.",
    });
    return;
  }
  if (choice === "2") { await sendAttendance(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "3") { await sendFeesAndPayLinks(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "4") { await sendTimetable(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "5") { await sendAnnouncements(outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "6") { await offerChildSwitch(session, outbox); return; }
  if (choice === "0" || /^(exit|bye|thanks|thank you)/i.test(choice)) {
    outbox.push({ body: "👋 Thanks for using Meclones College Lekki. Reply *menu* any time to come back." });
    return;
  }

  outbox.push({ body: "Sorry, I didn't catch that. Please reply with 1-6, 9 for staff, or 0 to exit." });
}

async function offerChildSwitch(
  session: { id: string; userId: string | null },
  outbox: Outbound[],
) {
  if (!session.userId) {
    outbox.push({ body: welcomeGuest() });
    return;
  }
  const children = await loadChildren(session.userId);
  if (children.length <= 1) {
    outbox.push({ body: "You only have one child on file. Reply *menu* to keep using the bot." });
    return;
  }
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "CHOOSE_CHILD" },
  });
  outbox.push({
    body: formatChildPicker(children.map(c => ({
      admissionNumber: c.admissionNumber,
      name: c.user.name,
      className: c.classRef ? `${c.classRef.name}${c.classRef.arm}` : "Unassigned",
    }))),
  });
}

// ─── Teacher menu ───────────────────────────────────────────────────

async function handleTeacherMenu(
  session: { id: string; userId: string | null },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) {
    outbox.push({ body: welcomeGuest() });
    return;
  }
  const choice = input.trim().toLowerCase();

  if (choice === "1") { await sendTeacherClasses(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "2") { await sendTeacherSchedule(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "3") { await sendTeacherDiscipline(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "4") { await sendAnnouncements(outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "0" || /^(exit|bye)/i.test(choice)) {
    outbox.push({ body: "👋 Goodbye. Reply *menu* any time to come back." });
    return;
  }

  outbox.push({ body: "Sorry, I didn't catch that. Please reply with 1-4, 9 for admin, or 0 to exit." });
}

// ─── Term picker (after Results) ────────────────────────────────────

async function handleTermPick(
  session: { id: string; studentId: string | null },
  input: string,
  outbox: Outbound[],
) {
  if (!session.studentId) {
    outbox.push({ body: welcomeGuest() });
    return;
  }
  const term = TERM_MAP[input.trim().toLowerCase()];
  if (!term) {
    outbox.push({ body: "Please reply 1, 2 or 3 — for First, Second or Third term." });
    return;
  }
  await sendResults(session.studentId, term, outbox);
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "PARENT_MENU" },
  });
  outbox.push({ body: backHint() });
}

function backHint() {
  return "Reply *menu* to see options again, *6* to switch child, or *9* to talk to a person.";
}

// ─── Escalation ─────────────────────────────────────────────────────

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
    body: `Got it — a staff member will reach out shortly. While you wait you can also call ${SCHOOL.phone}.`,
  });
}

// ─── Content fetchers (parent) ──────────────────────────────────────

async function sendResults(studentId: string, term: "FIRST" | "SECOND" | "THIRD", outbox: Outbound[]) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
  });
  if (!student) {
    outbox.push({ body: "Couldn't find that student record any more. Reply *menu* to start over." });
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

async function sendFeesAndPayLinks(studentId: string, outbox: Outbound[]) {
  const [student, term] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
        parentLinks: { include: { parent: { include: { user: { select: { email: true } } } } } },
      },
    }),
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

  // Pay-now links: only generate for unpaid fees. Cap at 3 to keep the
  // message readable; the portal link covers the rest.
  const unpaid = fees.filter(f => Number(f.balance) > 0).slice(0, 3);
  if (unpaid.length === 0) return;

  // Pick the parent's email (or the student's) for the Paystack init.
  const parentEmail = student.parentLinks[0]?.parent.user.email ?? null;
  if (!parentEmail) {
    outbox.push({
      body: `To pay online, log in to the portal: ${SCHOOL.website}/portal/parent/fees`,
    });
    return;
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "");
  const callbackUrl = `${siteUrl}/api/paystack/callback`;
  const links: Array<{ feeType: string; amount: number; balance: number; url: string }> = [];

  if (!process.env.PAYSTACK_SECRET_KEY) {
    outbox.push({
      body: `To pay online, log in to the portal: ${siteUrl}/portal/parent/fees`,
    });
    return;
  }

  for (const f of unpaid) {
    const reference = `WAB-${f.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      const init = await initTransaction({
        email: parentEmail,
        amountNaira: Number(f.balance),
        reference,
        callbackUrl,
        metadata: { feeId: f.id, studentId: student.id, source: "whatsapp" },
        subaccount: process.env.PAYSTACK_SUBACCOUNT_CODE,
      });
      links.push({
        feeType: f.feeType,
        amount: Number(f.amount),
        balance: Number(f.balance),
        url: init.authorization_url,
      });
    } catch (err) {
      console.error("[whatsapp-fsm] paystack init failed", err);
    }
  }

  if (links.length > 0) {
    const totalOutstanding = fees.reduce((s, f) => s + Number(f.balance), 0);
    outbox.push({
      body: formatPayPrompt({
        studentName: student.user.name,
        totalOutstanding,
        links,
        portalUrl: `${siteUrl}/portal/parent/fees`,
      }),
    });
  }
}

async function sendTimetable(studentId: string, outbox: Outbound[]) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true } },
      classRef: { select: { id: true, name: true, arm: true } },
    },
  });
  if (!student || !student.classRef) {
    outbox.push({ body: "No class set for this student yet — talk to the office." });
    return;
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId: student.classRef.id },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { user: { select: { name: true } } } },
    },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });

  const byDay: Record<string, Array<{ period: number; subject: string; teacher: string | null; startTime: string | null; endTime: string | null; note: string | null }>> = {};
  for (const e of entries) {
    if (!byDay[e.day]) byDay[e.day] = [];
    byDay[e.day].push({
      period: e.period,
      subject: e.subject?.name ?? "",
      teacher: e.teacher?.user.name ?? null,
      startTime: e.startTime,
      endTime: e.endTime,
      note: e.note,
    });
  }

  outbox.push({
    body: formatTimetable({
      studentName: student.user.name,
      className: `${student.classRef.name}${student.classRef.arm}`,
      byDay,
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

// ─── Content fetchers (teacher) ─────────────────────────────────────

async function sendTeacherClasses(userId: string, outbox: Outbound[]) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      user: { select: { name: true } },
      classTeacherOf: {
        select: {
          id: true, name: true, arm: true,
          _count: { select: { students: true } },
        },
      },
      classes: {
        include: {
          class: { select: { id: true, name: true, arm: true } },
        },
      },
      subjects: {
        include: { subject: { select: { name: true, code: true } } },
      },
    },
  });
  if (!teacher) {
    outbox.push({ body: "Teacher record not found. Talk to admin." });
    return;
  }

  // Build "teaching" list (subject-teacher assignments).
  const teaching = teacher.classes.map(ct => ({
    name: ct.class.name,
    arm: ct.class.arm,
    subjects: teacher.subjects.map(s => s.subject.code),
  }));

  outbox.push({
    body: formatTeacherClasses({
      teacherName: teacher.user.name,
      formOf: teacher.classTeacherOf.map(c => ({
        name: c.name, arm: c.arm, studentCount: c._count.students,
      })),
      teaching,
    }),
  });
}

async function sendTeacherSchedule(userId: string, outbox: Outbound[]) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, user: { select: { name: true } } },
  });
  if (!teacher) {
    outbox.push({ body: "Teacher record not found." });
    return;
  }
  const today = new Date();
  const day = DAY_NAMES[today.getDay()];
  const dayLabel = new Intl.DateTimeFormat("en-NG", { weekday: "long", day: "numeric", month: "short" }).format(today);

  const periods = await prisma.timetableEntry.findMany({
    where: { teacherId: teacher.id, day },
    orderBy: { period: "asc" },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true, arm: true } },
    },
  });

  outbox.push({
    body: formatTeacherSchedule({
      teacherName: teacher.user.name,
      dayLabel,
      periods: periods.map(p => ({
        period: p.period,
        className: `${p.class.name}${p.class.arm}`,
        subject: p.subject?.name ?? p.note ?? "—",
        startTime: p.startTime,
        endTime: p.endTime,
        room: p.room,
      })),
    }),
  });
}

async function sendTeacherDiscipline(userId: string, outbox: Outbound[]) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      classTeacherOf: { select: { id: true } },
      classes: { select: { classId: true } },
    },
  });
  if (!teacher) {
    outbox.push({ body: "Teacher record not found." });
    return;
  }
  const classIds = Array.from(new Set<string>([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.classId),
  ]));
  if (classIds.length === 0) {
    outbox.push({ body: "You haven't been assigned a class yet." });
    return;
  }

  const cases = await prisma.disciplinaryCase.findMany({
    where: { student: { classId: { in: classIds } }, status: { not: "RESOLVED" } },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          classRef: { select: { name: true, arm: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  outbox.push({
    body: formatRecentDiscipline(cases.map(c => ({
      studentName: c.student.user.name,
      className: c.student.classRef ? `${c.student.classRef.name}${c.student.classRef.arm}` : "Unassigned",
      category: c.category,
      severity: c.severity,
      status: c.status,
      date: c.incidentDate,
    }))),
  });
}
