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
import { normaliseNgPhone, type Outbound as CloudOutbound } from "./whatsapp-cloud";
import { SCHOOL } from "./constants";

// The FSM's Outbound is the same discriminated union the Cloud client
// dispatches on. Plain `{ body }` text still satisfies the text variant
// so older code keeps working unchanged.
type Outbound = CloudOutbound;

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

    // === Teacher: attendance flow ===
    case "ATTEND_PICK_CLASS":
      await handleAttendPickClass(session, trimmed, outbox);
      break;
    case "ATTEND_MARK":
      await handleAttendMark(session, trimmed, outbox);
      break;

    // === Teacher: incident logging ===
    case "INC_PICK_STUDENT":
      await handleIncPickStudent(session, trimmed, outbox);
      break;
    case "INC_PICK_TYPE":
      await handleIncPickType(session, trimmed, outbox);
      break;
    case "INC_DESC":
      await handleIncDesc(session, trimmed, outbox);
      break;
    case "INC_SEVERITY":
      await handleIncSeverity(session, trimmed, outbox);
      break;

    // === Parent: message a teacher ===
    case "MSG_PICK_TEACHER":
      await handleMsgPickTeacher(session, trimmed, outbox);
      break;
    case "MSG_COMPOSE":
      await handleMsgCompose(session, trimmed, outbox);
      break;

    // === Teacher: score entry ===
    case "SCORE_PICK_SUBJ_CLASS":
      await handleScorePickSubjClass(session, trimmed, outbox);
      break;
    case "SCORE_PICK_ASSESS":
      await handleScorePickAssess(session, trimmed, outbox);
      break;
    case "SCORE_ENTRY":
      await handleScoreEntry(session, trimmed, outbox);
      break;

    default:
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
  if (choice === "7" || /^(message|msg)/.test(choice) || choice === "pm:msg") {
    await startMessageTeacherFlow(session, outbox); return;
  }
  if (choice === "0" || /^(exit|bye|thanks|thank you)/i.test(choice)) {
    outbox.push({ body: "👋 Thanks for using Meclones College Lekki. Reply *menu* any time to come back." });
    return;
  }

  // List IDs from interactive menu
  if (choice === "pm:results") {
    await prisma.whatsAppSession.update({ where: { id: session.id }, data: { lastMenu: "AWAIT_TERM" } });
    outbox.push({ body: "Which term's results?\n\n1️⃣  First Term\n2️⃣  Second Term\n3️⃣  Third Term" });
    return;
  }
  if (choice === "pm:attendance") { await sendAttendance(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "pm:fees") { await sendFeesAndPayLinks(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "pm:timetable") { await sendTimetable(session.studentId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "pm:announce") { await sendAnnouncements(outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "pm:switch") { await offerChildSwitch(session, outbox); return; }

  outbox.push({ body: "Sorry, I didn't catch that. Reply 1-7, *9* for staff, or *0* to exit.\n\n1. Results\n2. Attendance\n3. Fees\n4. Timetable\n5. Announcements\n6. Switch child\n7. Message a teacher" });
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

  // Numbered text fallback (matches the legacy menu).
  if (choice === "1") { await sendTeacherClasses(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "2") { await sendTeacherSchedule(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "3") { await sendTeacherDiscipline(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "4") { await sendAnnouncements(outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "5" || /^attend/.test(choice) || choice === "tm:attend") {
    await startAttendanceFlow(session, outbox); return;
  }
  if (choice === "6" || /^(incident|discipline|log)/.test(choice) || choice === "tm:incident") {
    await startIncidentFlow(session, outbox); return;
  }
  if (choice === "7" || /^(score|grade|mark|enter)/.test(choice) || choice === "tm:scores") {
    await startScoreFlow(session, outbox); return;
  }

  // List-message IDs (sent when we render the menu as an interactive list)
  if (choice === "tm:classes") { await sendTeacherClasses(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "tm:schedule") { await sendTeacherSchedule(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "tm:discipline") { await sendTeacherDiscipline(session.userId, outbox); outbox.push({ body: backHint() }); return; }
  if (choice === "tm:announce") { await sendAnnouncements(outbox); outbox.push({ body: backHint() }); return; }

  if (choice === "0" || /^(exit|bye)/i.test(choice)) {
    outbox.push({ body: "👋 Goodbye. Reply *menu* any time to come back." });
    return;
  }

  outbox.push({ body: "Sorry, I didn't catch that. Reply 1-7, *9* for admin, or *0* to exit.\n\n1. My classes\n2. Today's schedule\n3. Recent discipline\n4. Announcements\n5. Take attendance\n6. Log incident\n7. Enter scores" });
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

// ============================================================
// PENDING DATA HELPERS — typed accessors for WhatsAppSession.pendingData
// ============================================================

type PendingData = Record<string, unknown> | null | undefined;

function readPending<T = Record<string, unknown>>(p: PendingData): T {
  return ((p ?? {}) as T);
}

async function setPending(sessionId: string, data: Record<string, unknown>) {
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { pendingData: data },
  });
}

async function clearPending(sessionId: string) {
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { pendingData: null as unknown as undefined },
  });
}

async function returnToTeacherMenu(sessionId: string, userId: string | null, outbox: Outbound[]) {
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { lastMenu: "TEACHER_MENU", pendingData: null as unknown as undefined },
  });
  if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    outbox.push({ body: formatTeacherMenu(u?.name.split(" ")[0] ?? "Teacher") });
  }
}

async function returnToParentMenu(sessionId: string, userId: string | null, studentId: string | null, outbox: Outbound[]) {
  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { lastMenu: "PARENT_MENU", pendingData: null as unknown as undefined },
  });
  if (userId && studentId) {
    const [user, student] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.student.findUnique({ where: { id: studentId }, include: { user: { select: { name: true } } } }),
    ]);
    const children = await loadChildren(userId);
    outbox.push({
      body: formatParentMenu({
        parentName: user?.name.split(" ")[0] ?? "there",
        currentChildName: student?.user.name ?? null,
        hasMultipleChildren: children.length > 1,
      }),
    });
  }
}

// ============================================================
// TEACHER: ATTENDANCE FLOW
// ============================================================

/** All classes a teacher works with — homeroom + subject-teacher assignments. */
async function teacherClassOptions(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      classTeacherOf: { select: { id: true, name: true, arm: true } },
      classes: { include: { class: { select: { id: true, name: true, arm: true } } } },
    },
  });
  if (!teacher) return [];
  const seen = new Set<string>();
  const opts: Array<{ id: string; label: string }> = [];
  for (const c of teacher.classTeacherOf) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    opts.push({ id: c.id, label: `${c.name}${c.arm}` });
  }
  for (const ct of teacher.classes) {
    if (seen.has(ct.class.id)) continue;
    seen.add(ct.class.id);
    opts.push({ id: ct.class.id, label: `${ct.class.name}${ct.class.arm}` });
  }
  return opts;
}

async function startAttendanceFlow(session: { id: string; userId: string | null }, outbox: Outbound[]) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const opts = await teacherClassOptions(session.userId);
  if (opts.length === 0) {
    outbox.push({ body: "You don't have any classes assigned yet. Talk to admin." });
    return;
  }

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "ATTEND_PICK_CLASS", pendingData: { stage: "pick_class", opts } },
  });

  // Emit as an interactive list when possible. WhatsApp lists max 10 rows.
  outbox.push({
    kind: "list",
    body: "Which class are you taking attendance for?",
    buttonLabel: "Pick class",
    sections: [{
      title: "Your classes",
      rows: opts.slice(0, 10).map(o => ({ id: `attend:${o.id}`, title: o.label })),
    }],
  });
}

async function handleAttendPickClass(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{ stage: string; opts: Array<{ id: string; label: string }> }>(session.pendingData);
  const opts = data.opts ?? [];

  // Accept either interactive ID (attend:CLASSID), exact label, or 1-based index.
  let classId: string | null = null;
  if (input.startsWith("attend:")) classId = input.slice("attend:".length);
  if (!classId) {
    const byLabel = opts.find(o => o.label.toLowerCase() === input.trim().toLowerCase());
    if (byLabel) classId = byLabel.id;
  }
  if (!classId) {
    const idx = Number(input.trim()) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < opts.length) classId = opts[idx].id;
  }
  if (!classId) {
    outbox.push({ body: `Sorry, I didn't recognise "${input}". Reply with the class name or pick from the list.` });
    return;
  }

  // Build the roster.
  const roster = await prisma.student.findMany({
    where: { classId, graduatedAt: null },
    include: { user: { select: { name: true } } },
    orderBy: [{ user: { name: "asc" } }],
  });
  if (roster.length === 0) {
    outbox.push({ body: "That class has no students yet. Talk to admin." });
    await returnToTeacherMenu(session.id, session.userId, outbox);
    return;
  }

  const klass = await prisma.class.findUnique({ where: { id: classId }, select: { name: true, arm: true } });

  await setPending(session.id, {
    stage: "mark",
    classId,
    classLabel: klass ? `${klass.name}${klass.arm}` : "class",
    rosterIds: roster.map(s => s.id),
    rosterNames: roster.map(s => s.user.name),
  });
  await prisma.whatsAppSession.update({ where: { id: session.id }, data: { lastMenu: "ATTEND_MARK" } });

  const rosterText = roster.map((s, i) => `${i + 1}. ${s.user.name}`).join("\n");
  outbox.push({
    body: `${klass ? `${klass.name}${klass.arm}` : "Class"} · ${roster.length} students\n\n${rosterText}\n\nReply with absent student numbers, comma-separated.\nExample: *3, 7, 12*\n\nOr reply *all present* if no one is absent.`,
  });
}

async function handleAttendMark(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{
    classId: string;
    classLabel: string;
    rosterIds: string[];
    rosterNames: string[];
  }>(session.pendingData);
  if (!data.classId || !data.rosterIds?.length) {
    outbox.push({ body: "Something went wrong with that attendance session. Reply *menu* to start over." });
    return;
  }

  const cleanInput = input.trim().toLowerCase();
  let absentIdxs: number[] = [];
  if (/^(all\s+present|none|no one|nobody)/.test(cleanInput)) {
    absentIdxs = [];
  } else {
    absentIdxs = cleanInput.split(/[,\s]+/)
      .map(x => parseInt(x, 10))
      .filter(n => Number.isInteger(n) && n >= 1 && n <= data.rosterIds.length)
      .map(n => n - 1);
    absentIdxs = Array.from(new Set(absentIdxs));
  }

  // Find the teacher for markedById.
  const teacher = await prisma.teacher.findUnique({ where: { userId: session.userId }, select: { id: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeTerm = await prisma.term.findFirst({ where: { isActive: true }, select: { id: true } });

  const absentIds = new Set(absentIdxs.map(i => data.rosterIds[i]));
  let written = 0;
  for (let i = 0; i < data.rosterIds.length; i++) {
    const studentId = data.rosterIds[i];
    const status = absentIds.has(studentId) ? "ABSENT" : "PRESENT";
    try {
      await prisma.attendance.upsert({
        where: { studentId_date: { studentId, date: today } },
        update: { status, classId: data.classId, termId: activeTerm?.id ?? null, markedById: teacher?.id ?? null },
        create: { studentId, classId: data.classId, termId: activeTerm?.id ?? null, status, date: today, markedById: teacher?.id ?? null },
      });
      written++;
    } catch (err) {
      console.error("[attend] upsert failed for", studentId, err);
    }
  }

  // Notify parents of absent students via WhatsApp (best-effort; non-blocking on failure).
  const absentNames: string[] = [];
  for (const i of absentIdxs) {
    absentNames.push(data.rosterNames[i]);
    const studentId = data.rosterIds[i];
    try {
      const stu = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { name: true } },
          parentLinks: { include: { parent: { include: { user: { select: { phone: true, name: true } } } } } },
        },
      });
      for (const link of stu?.parentLinks ?? []) {
        const phone = link.parent.user.phone;
        if (!phone) continue;
        const { sendWhatsAppText } = await import("./whatsapp-cloud");
        await sendWhatsAppText(
          phone,
          `${SCHOOL.shortName}: ${stu?.user.name ?? "Your child"} is marked absent today (${today.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" })}). If this is unexpected please reply to this thread or call the school office.`,
        );
      }
    } catch (err) {
      console.error("[attend] parent notify failed", err);
    }
  }

  await auditLog({
    action: "whatsapp.attendance",
    targetType: "Class",
    targetId: data.classId,
    metadata: { absentCount: absentIdxs.length, totalCount: data.rosterIds.length, written },
  });

  outbox.push({
    body: `✅ Register saved for ${data.classLabel}\n\nPresent: ${data.rosterIds.length - absentIdxs.length}\nAbsent: ${absentIdxs.length}${absentNames.length ? `\n  • ${absentNames.join("\n  • ")}` : ""}\n\nParents of absent students have been notified.`,
  });
  await returnToTeacherMenu(session.id, session.userId, outbox);
}

// ============================================================
// TEACHER: INCIDENT LOGGING FLOW
// ============================================================

async function startIncidentFlow(session: { id: string; userId: string | null }, outbox: Outbound[]) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "INC_PICK_STUDENT", pendingData: { stage: "pick_student" } },
  });
  outbox.push({
    body: "OK — which student? Reply with their full name *or* their admission number (e.g. MCL/SS3A/2526/001).",
  });
}

async function handleIncPickStudent(
  session: { id: string; userId: string | null },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const candidate = input.trim();

  // Try admission number first.
  let student = await prisma.student.findUnique({
    where: { admissionNumber: candidate.toUpperCase().replace(/\s+/g, "") },
    include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
  });

  // Then by name (case-insensitive contains).
  if (!student) {
    const matches = await prisma.student.findMany({
      where: { graduatedAt: null, user: { name: { contains: candidate, mode: "insensitive" } } },
      include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
      take: 5,
    });
    if (matches.length === 1) student = matches[0];
    else if (matches.length > 1) {
      outbox.push({
        body: `Found ${matches.length} students matching "${candidate}". Reply with the admission number to disambiguate:\n\n` +
          matches.map(m => `• *${m.user.name}* — ${m.classRef ? m.classRef.name + m.classRef.arm : "Unassigned"} (${m.admissionNumber})`).join("\n"),
      });
      return;
    }
  }

  if (!student) {
    outbox.push({ body: `No student found matching "${candidate}". Try again with full name or admission number, or reply *menu* to cancel.` });
    return;
  }

  await setPending(session.id, {
    studentId: student.id,
    studentName: student.user.name,
    classLabel: student.classRef ? `${student.classRef.name}${student.classRef.arm}` : "Unassigned",
  });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "INC_PICK_TYPE" },
  });

  outbox.push({
    kind: "buttons",
    body: `${student.user.name} · ${student.classRef ? student.classRef.name + student.classRef.arm : "Unassigned"}\n\nWhat kind of incident?`,
    buttons: [
      { id: "inc:type:BEHAVIOUR", title: "Behaviour" },
      { id: "inc:type:LATENESS", title: "Uniform/Lateness" },
      { id: "inc:type:BULLYING", title: "Bullying" },
    ],
  });
}

async function handleIncPickType(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  const norm = input.trim().toLowerCase();
  let category: "INSUBORDINATION" | "UNIFORM" | "BULLYING" | "FIGHTING" | "OTHER" = "OTHER";
  if (norm.includes("behav") || norm === "inc:type:behaviour" || norm === "1") category = "INSUBORDINATION";
  else if (norm.includes("uniform") || norm.includes("late") || norm === "inc:type:lateness" || norm === "2") category = "UNIFORM";
  else if (norm.includes("bully") || norm.includes("safeguard") || norm === "inc:type:bullying" || norm === "3") category = "BULLYING";

  const data = readPending<{ studentId: string; studentName: string }>(session.pendingData);
  await setPending(session.id, { ...data, category });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "INC_DESC" },
  });
  outbox.push({
    body: `Got it — *${category}*\n\nNow tell me what happened, in your own words. Be specific (when, where, what).`,
  });
}

async function handleIncDesc(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  const data = readPending<{ studentId: string; studentName: string; category: string }>(session.pendingData);
  const desc = input.trim();
  if (desc.length < 10) {
    outbox.push({ body: "Please give a bit more detail (at least 10 characters)." });
    return;
  }
  await setPending(session.id, { ...data, description: desc });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "INC_SEVERITY" },
  });
  outbox.push({
    kind: "buttons",
    body: "How severe is this?",
    buttons: [
      { id: "inc:sev:MINOR", title: "Minor" },
      { id: "inc:sev:MODERATE", title: "Moderate" },
      { id: "inc:sev:MAJOR", title: "Serious" },
    ],
  });
}

async function handleIncSeverity(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const norm = input.trim().toLowerCase();
  let severity: "MINOR" | "MODERATE" | "MAJOR" | "SEVERE" = "MINOR";
  if (norm.includes("moderate") || norm === "inc:sev:moderate" || norm === "2") severity = "MODERATE";
  else if (norm.includes("major") || norm.includes("serious") || norm === "inc:sev:major" || norm === "3") severity = "MAJOR";
  else if (norm.includes("severe") || norm === "inc:sev:severe" || norm === "4") severity = "SEVERE";

  const data = readPending<{ studentId: string; studentName: string; category: string; description: string; classLabel: string }>(session.pendingData);

  const reporter = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, role: true },
  });
  if (!reporter || !data.studentId) {
    outbox.push({ body: "Sorry, something went wrong with that incident log. Reply *menu* to start over." });
    return;
  }

  let inc;
  try {
    inc = await prisma.disciplinaryCase.create({
      data: {
        studentId: data.studentId,
        reportedById: reporter.id,
        reporterName: reporter.name,
        reporterRole: reporter.role,
        incidentDate: new Date(),
        category: data.category as "INSUBORDINATION" | "UNIFORM" | "BULLYING" | "FIGHTING" | "OTHER",
        severity: severity,
        description: data.description,
        sanction: severity === "MINOR" ? "WARNING" : severity === "MODERATE" ? "DETENTION" : "PARENT_MEETING",
      },
    });
  } catch (err) {
    console.error("[whatsapp-fsm] incident create failed", err);
    outbox.push({ body: "Couldn't save that incident — please use the portal. Reply *menu* to continue." });
    return;
  }

  await auditLog({
    action: "whatsapp.incident.log",
    targetType: "DisciplinaryCase",
    targetId: inc.id,
    metadata: { severity, category: data.category, via: "whatsapp" },
  });

  // Notify parents on WhatsApp.
  try {
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      include: { parentLinks: { include: { parent: { include: { user: { select: { phone: true, name: true, id: true } } } } } } },
    });
    const { sendWhatsAppText } = await import("./whatsapp-cloud");
    for (const link of student?.parentLinks ?? []) {
      const phone = link.parent.user.phone;
      if (!phone) continue;
      await sendWhatsAppText(
        phone,
        `${SCHOOL.shortName} · disciplinary notice\n\nA ${severity.toLowerCase()} incident involving ${data.studentName} was recorded today by ${reporter.name}.\n\nCategory: ${data.category}\nNotes: ${data.description.slice(0, 200)}\n\nReply *menu* and pick *discipline* to acknowledge, or call ${SCHOOL.phone}.`,
      );
      // In-app notification too, for the bell.
      try {
        notify({
          userIds: [link.parent.user.id],
          type: "DISCIPLINARY_INCIDENT",
          title: `Incident logged for ${data.studentName}`,
          body: `${severity} · ${data.category}`,
          href: `/portal/parent/discipline`,
        }).catch(err => console.error("[whatsapp-fsm] notify failed", err));
      } catch {}
    }
  } catch (err) {
    console.error("[whatsapp-fsm] incident parent notify failed", err);
  }

  outbox.push({
    body: `✅ Incident logged · Ref ${inc.id.slice(-8).toUpperCase()}\n\n• Student: ${data.studentName}\n• Category: ${data.category}\n• Severity: ${severity}\n• Reported by: ${reporter.name}\n\nThe student's parents have been notified for acknowledgement.`,
  });
  await returnToTeacherMenu(session.id, session.userId, outbox);
}

// ============================================================
// PARENT: MESSAGE A TEACHER FLOW
// ============================================================

async function startMessageTeacherFlow(
  session: { id: string; userId: string | null; studentId: string | null },
  outbox: Outbound[],
) {
  if (!session.studentId) { outbox.push({ body: welcomeGuest() }); return; }

  // Build the list of teachers — homeroom (Class.classTeacher) +
  // everyone teaching this class via the ClassTeacher join. We also
  // pull each teacher's subjects[] so we can label them with the
  // subject they teach (best-effort: first subject by name).
  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      user: { select: { name: true } },
      classRef: {
        include: {
          classTeacher: { include: { user: { select: { name: true } } } },
          teachers: {
            include: {
              teacher: {
                include: {
                  user: { select: { name: true } },
                  subjects: { include: { subject: { select: { name: true, code: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student?.classRef) {
    outbox.push({ body: "No class set for this student yet — talk to the office." });
    return;
  }

  const teachers: Array<{ id: string; label: string; sub: string }> = [];
  if (student.classRef.classTeacher) {
    teachers.push({
      id: student.classRef.classTeacher.id,
      label: student.classRef.classTeacher.user.name,
      sub: "Form teacher",
    });
  }
  const seen = new Set(teachers.map(t => t.id));
  for (const ct of student.classRef.teachers) {
    if (seen.has(ct.teacher.id)) continue;
    seen.add(ct.teacher.id);
    const firstSub = ct.teacher.subjects[0]?.subject;
    teachers.push({
      id: ct.teacher.id,
      label: ct.teacher.user.name,
      sub: firstSub ? firstSub.name : "Subject teacher",
    });
  }
  if (teachers.length === 0) {
    outbox.push({ body: "No teachers assigned to this class yet — talk to admin." });
    return;
  }

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "MSG_PICK_TEACHER", pendingData: { stage: "pick_teacher", teachers } },
  });

  outbox.push({
    kind: "list",
    body: `Which teacher would you like to message about *${student.user.name}*?`,
    buttonLabel: "Pick teacher",
    sections: [{
      title: `${student.classRef.name}${student.classRef.arm} staff`,
      rows: teachers.slice(0, 10).map((t, i) => ({
        id: `msg:teacher:${t.id}`,
        title: t.label.slice(0, 24),
        description: t.sub,
      })),
    }],
  });
}

async function handleMsgPickTeacher(
  session: { id: string; userId: string | null; studentId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId || !session.studentId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{ teachers: Array<{ id: string; label: string; sub: string }> }>(session.pendingData);
  const teachers = data.teachers ?? [];

  let teacherId: string | null = null;
  if (input.startsWith("msg:teacher:")) teacherId = input.slice("msg:teacher:".length);
  if (!teacherId) {
    const exact = teachers.find(t => t.label.toLowerCase() === input.trim().toLowerCase());
    if (exact) teacherId = exact.id;
  }
  if (!teacherId) {
    const idx = Number(input.trim()) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < teachers.length) teacherId = teachers[idx].id;
  }
  if (!teacherId) {
    outbox.push({ body: `I couldn't find that teacher. Pick from the list or reply with their name.` });
    return;
  }

  const chosen = teachers.find(t => t.id === teacherId);
  await setPending(session.id, { teacherId, teacherLabel: chosen?.label ?? "Teacher", teacherSub: chosen?.sub ?? "" });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "MSG_COMPOSE" },
  });

  outbox.push({
    body: `OK — writing to *${chosen?.label}* (${chosen?.sub}). Type your message in the next reply.\n\nReply *menu* to cancel.`,
  });
}

async function handleMsgCompose(
  session: { id: string; userId: string | null; studentId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId || !session.studentId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{ teacherId: string; teacherLabel: string }>(session.pendingData);
  if (!data.teacherId) {
    outbox.push({ body: "Something went wrong. Reply *menu* and try again." });
    return;
  }
  const body = input.trim();
  if (body.length < 3) {
    outbox.push({ body: "That's a bit short — please type the full message." });
    return;
  }

  // Find / create the thread.
  const parent = await prisma.parent.findUnique({ where: { userId: session.userId } });
  if (!parent) {
    outbox.push({ body: "Your parent record isn't linked. Talk to admin." });
    await returnToParentMenu(session.id, session.userId, session.studentId, outbox);
    return;
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: { user: { select: { name: true } } },
  });

  let thread = await prisma.messageThread.findFirst({
    where: { parentId: parent.id, teacherId: data.teacherId, studentId: session.studentId },
  });
  if (!thread) {
    thread = await prisma.messageThread.create({
      data: {
        parentId: parent.id,
        teacherId: data.teacherId,
        studentId: session.studentId,
        subject: `About ${student?.user.name ?? "my child"}`,
      },
    });
  }

  // Persist message + bump counters.
  const message = await prisma.message.create({
    data: {
      threadId: thread.id,
      authorId: session.userId,
      body,
    },
  });
  await prisma.messageThread.update({
    where: { id: thread.id },
    data: {
      lastMessageAt: new Date(),
      teacherUnread: { increment: 1 },
    },
  });

  // Notify teacher in-app + on WhatsApp.
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (teacher?.user.id) {
      notify({
        userIds: [teacher.user.id],
        type: "MESSAGE_RECEIVED",
        title: `New WhatsApp message from a parent`,
        body: body.slice(0, 120),
        href: `/portal/teacher/messages/${thread.id}`,
      }).catch(() => {});
    }
    if (teacher?.user.phone) {
      const { sendWhatsAppText } = await import("./whatsapp-cloud");
      const parentUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
      await sendWhatsAppText(
        teacher.user.phone,
        `${SCHOOL.shortName} · parent message from ${parentUser?.name ?? "parent"}\n\nRe: ${student?.user.name ?? "student"}\n\n"${body.slice(0, 280)}"\n\nReply on the portal: ${(process.env.NEXT_PUBLIC_SITE_URL ?? SCHOOL.website).replace(/\/$/, "")}/portal/teacher/messages/${thread.id}`,
      );
    }
  } catch (err) {
    console.error("[msg] notify teacher failed", err);
  }

  await auditLog({
    action: "whatsapp.message.send",
    targetType: "MessageThread",
    targetId: thread.id,
    metadata: { via: "whatsapp" },
  });

  outbox.push({
    body: `✅ Sent to ${data.teacherLabel}. I'll let you know when they reply.\n\nYou can keep messaging — every reply is delivered to them on the portal and notified.`,
  });
  await returnToParentMenu(session.id, session.userId, session.studentId, outbox);
}

// ============================================================
// TEACHER: SCORE ENTRY FLOW
// ============================================================

/** Subject+class combinations the teacher actually teaches. */
async function teacherSubjectClassOptions(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: {
      subjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
      classes: { include: { class: { select: { id: true, name: true, arm: true, subjects: { select: { subjectId: true } } } } } },
    },
  });
  if (!teacher) return [];
  // For each (class, subject) pair where the teacher teaches the subject
  // AND the class offers it, emit one entry.
  const subjectIds = new Set(teacher.subjects.map(s => s.subject.id));
  const out: Array<{ id: string; subjectId: string; subjectName: string; classId: string; classLabel: string }> = [];
  for (const ct of teacher.classes) {
    for (const cs of ct.class.subjects) {
      if (!subjectIds.has(cs.subjectId)) continue;
      const subj = teacher.subjects.find(s => s.subject.id === cs.subjectId)?.subject;
      if (!subj) continue;
      const classLabel = `${ct.class.name}${ct.class.arm}`;
      out.push({
        id: `${ct.class.id}::${subj.id}`,
        subjectId: subj.id,
        subjectName: subj.name,
        classId: ct.class.id,
        classLabel,
      });
    }
  }
  return out;
}

async function startScoreFlow(session: { id: string; userId: string | null }, outbox: Outbound[]) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const opts = await teacherSubjectClassOptions(session.userId);
  if (opts.length === 0) {
    outbox.push({ body: "You don't have any subject-class assignments yet. Talk to admin." });
    return;
  }

  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "SCORE_PICK_SUBJ_CLASS", pendingData: { stage: "pick", opts } },
  });

  outbox.push({
    kind: "list",
    body: "Which subject + class are you entering scores for?",
    buttonLabel: "Pick",
    sections: [{
      title: "Your assignments",
      rows: opts.slice(0, 10).map(o => ({
        id: `score:${o.classId}::${o.subjectId}`,
        title: `${o.subjectName.slice(0, 14)} — ${o.classLabel}`.slice(0, 24),
        description: `${o.subjectName} for ${o.classLabel}`.slice(0, 72),
      })),
    }],
  });
}

async function handleScorePickSubjClass(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{ opts: Array<{ id: string; subjectId: string; subjectName: string; classId: string; classLabel: string }> }>(session.pendingData);
  const opts = data.opts ?? [];

  let chosen = null;
  if (input.startsWith("score:")) {
    const id = input.slice("score:".length);
    chosen = opts.find(o => o.id === id) ?? null;
  }
  if (!chosen) {
    const idx = Number(input.trim()) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < opts.length) chosen = opts[idx];
  }
  if (!chosen) {
    outbox.push({ body: "I didn't recognise that. Pick from the list." });
    return;
  }

  await setPending(session.id, {
    classId: chosen.classId,
    classLabel: chosen.classLabel,
    subjectId: chosen.subjectId,
    subjectName: chosen.subjectName,
  });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "SCORE_PICK_ASSESS" },
  });

  outbox.push({
    kind: "buttons",
    body: `${chosen.subjectName} · ${chosen.classLabel}\n\nWhich assessment are you entering?`,
    buttons: [
      { id: "score:ca1", title: "CA1 (out of 20)" },
      { id: "score:ca2", title: "CA2 (out of 20)" },
      { id: "score:exam", title: "Exam (out of 60)" },
    ],
  });
}

async function handleScorePickAssess(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const norm = input.trim().toLowerCase();
  let field: "ca1" | "ca2" | "exam" | null = null;
  let max = 20;
  if (norm.includes("ca1") || norm === "1") { field = "ca1"; max = 20; }
  else if (norm.includes("ca2") || norm === "2") { field = "ca2"; max = 20; }
  else if (norm.includes("exam") || norm === "3") { field = "exam"; max = 60; }
  if (!field) {
    outbox.push({ body: "Please tap one of the three buttons (CA1, CA2 or Exam)." });
    return;
  }

  const data = readPending<{ classId: string; classLabel: string; subjectId: string; subjectName: string }>(session.pendingData);
  if (!data.classId || !data.subjectId) {
    outbox.push({ body: "Something went wrong — reply *menu* and try again." });
    return;
  }

  // Build the roster for this class.
  const roster = await prisma.student.findMany({
    where: { classId: data.classId, graduatedAt: null },
    include: { user: { select: { name: true } } },
    orderBy: [{ user: { name: "asc" } }],
  });
  if (roster.length === 0) {
    outbox.push({ body: "That class has no students yet." });
    await returnToTeacherMenu(session.id, session.userId, outbox);
    return;
  }

  await setPending(session.id, {
    ...data,
    field,
    max,
    rosterIds: roster.map(s => s.id),
    rosterNames: roster.map(s => s.user.name),
    saved: 0,
  });
  await prisma.whatsAppSession.update({
    where: { id: session.id },
    data: { lastMenu: "SCORE_ENTRY" },
  });

  const rosterText = roster.map((s, i) => `${i + 1}. ${s.user.name}`).join("\n");
  outbox.push({
    body: `${data.subjectName} · ${data.classLabel} · ${field.toUpperCase()} (out of ${max})\n\n${rosterText}\n\nSend scores as one per line, like:\n  *1 18*\n  *2 14*\n  *3 17*\n\nOr by name:\n  *Adaeze 18*\n  *Ayomide 14*\n\nReply *done* when finished, or *menu* to cancel.`,
  });
}

async function handleScoreEntry(
  session: { id: string; userId: string | null; pendingData: PendingData },
  input: string,
  outbox: Outbound[],
) {
  if (!session.userId) { outbox.push({ body: welcomeGuest() }); return; }
  const data = readPending<{
    classId: string;
    classLabel: string;
    subjectId: string;
    subjectName: string;
    field: "ca1" | "ca2" | "exam";
    max: number;
    rosterIds: string[];
    rosterNames: string[];
    saved: number;
  }>(session.pendingData);

  if (/^(done|finish|publish|stop)/i.test(input.trim())) {
    outbox.push({ body: `✅ Done. ${data.saved ?? 0} scores saved as draft for ${data.subjectName} · ${data.classLabel} · ${(data.field ?? "").toUpperCase()}.\n\nDrafts go live when you publish them in the portal (or reply *publish* here for next-sprint feature).` });
    await returnToTeacherMenu(session.id, session.userId, outbox);
    return;
  }

  // Parse lines like "Olu 18", "1 18", "Adaeze Bello, 18"
  const lines = input.split(/\n+/).map(l => l.trim()).filter(Boolean);
  let saved = 0;
  const errors: string[] = [];

  // Resolve session + term once.
  const activeSession = await prisma.academicSession.findFirst({ where: { isActive: true } });
  const activeTerm = await prisma.term.findFirst({ where: { isActive: true } });
  if (!activeSession || !activeTerm) {
    outbox.push({ body: "No active academic session/term set. Talk to admin." });
    return;
  }
  const teacher = await prisma.teacher.findUnique({ where: { userId: session.userId }, select: { id: true } });

  for (const line of lines) {
    const m = line.match(/^(.*?)[,\s]+(\d{1,3})\s*$/);
    if (!m) { errors.push(`✗ "${line}" — couldn't read score`); continue; }
    const ref = m[1].trim();
    const score = parseInt(m[2], 10);
    if (Number.isNaN(score) || score < 0 || score > data.max) {
      errors.push(`✗ "${ref}" — score ${score} out of range (0–${data.max})`); continue;
    }
    // Resolve student: by index, by exact name, by partial name.
    let studentId: string | null = null;
    const idx = Number(ref) - 1;
    if (Number.isInteger(idx) && idx >= 0 && idx < data.rosterIds.length) {
      studentId = data.rosterIds[idx];
    } else {
      const lower = ref.toLowerCase();
      const matchIdx = data.rosterNames.findIndex(n => n.toLowerCase() === lower);
      if (matchIdx >= 0) studentId = data.rosterIds[matchIdx];
      if (!studentId) {
        const partials = data.rosterNames
          .map((n, i) => ({ n, i }))
          .filter(x => x.n.toLowerCase().includes(lower));
        if (partials.length === 1) studentId = data.rosterIds[partials[0].i];
        else if (partials.length > 1) {
          errors.push(`✗ "${ref}" — matches ${partials.length} students, use full name or number`);
          continue;
        }
      }
    }
    if (!studentId) { errors.push(`✗ "${ref}" — no student match`); continue; }

    // Upsert the Result, updating only the chosen field; recompute total.
    try {
      const existing = await prisma.result.findFirst({
        where: { studentId, subjectId: data.subjectId, termId: activeTerm.id, sessionId: activeSession.id },
      });
      const merged = {
        ca1: existing?.ca1 ?? 0,
        ca2: existing?.ca2 ?? 0,
        exam: existing?.exam ?? 0,
      };
      merged[data.field] = score;
      const total = merged.ca1 + merged.ca2 + merged.exam;
      const grade = naecoGrade(total);

      if (existing) {
        await prisma.result.update({
          where: { id: existing.id },
          data: {
            ...merged,
            total,
            grade,
            enteredById: teacher?.id ?? existing.enteredById,
          },
        });
      } else {
        await prisma.result.create({
          data: {
            studentId,
            subjectId: data.subjectId,
            termId: activeTerm.id,
            sessionId: activeSession.id,
            enteredById: teacher?.id,
            ca1: merged.ca1,
            ca2: merged.ca2,
            exam: merged.exam,
            total,
            grade,
            isPublished: false,
          },
        });
      }
      saved++;
    } catch (err) {
      console.error("[score] save failed", err);
      errors.push(`✗ "${ref}" — DB save failed`);
    }
  }

  const newSaved = (data.saved ?? 0) + saved;
  await setPending(session.id, { ...data, saved: newSaved });

  await auditLog({
    action: "whatsapp.score.batch",
    targetType: "Subject",
    targetId: data.subjectId,
    metadata: { classId: data.classId, field: data.field, saved, total: newSaved, errors: errors.length },
  });

  outbox.push({
    body: `${saved} score${saved === 1 ? "" : "s"} saved. Running total: *${newSaved}* for ${data.subjectName} · ${data.classLabel} · ${data.field.toUpperCase()}.${errors.length ? "\n\n" + errors.slice(0, 5).join("\n") : ""}\n\nKeep going, or reply *done* when finished.`,
  });
}

/** NECO-style 9-point grade band. */
function naecoGrade(total: number): string {
  if (total >= 75) return "A1";
  if (total >= 70) return "B2";
  if (total >= 65) return "B3";
  if (total >= 60) return "C4";
  if (total >= 55) return "C5";
  if (total >= 50) return "C6";
  if (total >= 45) return "D7";
  if (total >= 40) return "E8";
  return "F9";
}
