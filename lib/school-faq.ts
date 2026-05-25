/**
 * Keyword-matched static FAQ. Used as a fallback when ANTHROPIC_API_KEY
 * isn't set on the server (or temporarily unreachable) — the chatbot
 * still answers common questions properly instead of giving up with a
 * generic "call us" stub.
 *
 * Match order matters: more specific patterns first, generic catch-alls
 * last. Each handler returns a Markdown-ish string.
 */

import { SCHOOL, PROGRAMS, EXAMS, STATS } from "./constants";

interface FaqEntry {
  /** Lowercase keywords; if ANY appears in the user's question (after
   * lowercasing), the handler fires. */
  keywords: string[];
  answer: () => string;
}

const FAQ: FaqEntry[] = [
  // ─── Admission ─────────────────────────────────────────────────────
  {
    keywords: ["apply", "application", "admission", "admit", "register", "enrol", "enroll", "intake"],
    answer: () => (
`To apply to ${SCHOOL.shortName}, fill out the online admission form right here on this site — there's an "Apply" link in the top menu, or go directly to ${SCHOOL.website}/apply.

You'll provide your child's details, your contact info, and previous school. The admissions team usually responds within 24 hours to schedule the entrance assessment.

Questions? Reach the admissions office:
• Email: ${SCHOOL.admissionsEmail}
• Phone: ${SCHOOL.phone}`
    ),
  },

  // ─── Fees ──────────────────────────────────────────────────────────
  {
    keywords: ["fee", "fees", "tuition", "cost", "price", "how much", "payment", "pay"],
    answer: () => (
`Fees vary by class level and the term. Tuition, development levy, textbook fees and uniforms are billed separately each term.

For the current fee schedule we'd rather quote you the right number for your child's year-group — call the school office directly so we can walk through it:

📞 ${SCHOOL.phone}
✉ ${SCHOOL.email}

Once your child is enrolled, you'll pay online via Paystack from the parent portal, or in person at the office (cash, transfer, POS, or cheque). Receipts are issued instantly.`
    ),
  },

  // ─── Programs ──────────────────────────────────────────────────────
  {
    keywords: ["program", "programme", "class", "level", "grade", "subject", "what do you offer", "curriculum"],
    answer: () => (
`We run the full six-year Nigerian secondary curriculum:

• **Junior Secondary** — ${PROGRAMS.filter(p => p.startsWith("JSS")).join(", ")}
• **Senior Secondary** — ${PROGRAMS.filter(p => p.startsWith("SS")).join(", ")}

We also prepare students for major exams: ${EXAMS.join(", ")}.

${STATS.teachers}+ teachers and ${STATS.yearsExperience} years of teaching experience. Want to discuss a specific subject combination? Call ${SCHOOL.phone}.`
    ),
  },

  // ─── Tour / visit ──────────────────────────────────────────────────
  {
    keywords: ["tour", "visit", "see the school", "come around", "book", "open day", "inspect"],
    answer: () => (
`Yes — we'd love to show you around. Book a school visit on this site (look for the "Book a visit" page in the menu) and pick a slot that works for you.

You can also just walk in during office hours: ${SCHOOL.hours}.

📞 ${SCHOOL.phone} to confirm a time
📍 ${SCHOOL.address}`
    ),
  },

  // ─── Contact / location ────────────────────────────────────────────
  {
    keywords: ["contact", "reach", "call", "phone", "email", "where are you", "location", "address", "where is the school"],
    answer: () => (
`You can reach the school office:

📞 ${SCHOOL.phone}
📱 WhatsApp: ${SCHOOL.phoneIntl}
✉ ${SCHOOL.email}
📍 ${SCHOOL.address}
🕒 ${SCHOOL.hours}

For admissions specifically: ${SCHOOL.admissionsEmail}.`
    ),
  },

  // ─── Hours ─────────────────────────────────────────────────────────
  {
    keywords: ["hours", "open", "when do you open", "what time", "office hours", "closed"],
    answer: () => (
`School office hours are ${SCHOOL.hours}.

Outside those hours you can still drop us a WhatsApp on ${SCHOOL.phoneIntl} or email ${SCHOOL.email} — someone will respond the next working day.`
    ),
  },

  // ─── Portal / login ────────────────────────────────────────────────
  {
    keywords: ["portal", "login", "log in", "sign in", "parent account", "student account", "password"],
    answer: () => (
`Parents, teachers and students sign in at ${SCHOOL.website}/portal/login.

You can log in with either your email OR your admission number (for students). Forgot your password? There's a "Forgot password?" link on the login page — we'll email you a reset link.

If you've never received your login details, call ${SCHOOL.phone} and we'll set you up.`
    ),
  },

  // ─── Results / fees / attendance — specific child ──────────────────
  {
    keywords: ["my child", "my son", "my daughter", "result", "attendance", "score", "report card"],
    answer: () => (
`For your child's specific records — results, attendance, fee balance, term reports — please log in to the parent portal at ${SCHOOL.website}/portal/login.

If you haven't been issued portal credentials yet, call ${SCHOOL.phone} or email ${SCHOOL.admissionsEmail} and we'll get you set up.`
    ),
  },

  // ─── Boarding / transport / meals ──────────────────────────────────
  {
    keywords: ["boarding", "transport", "bus", "meal", "food", "lunch", "uniform", "hostel"],
    answer: () => (
`For specifics on boarding, bus routes, meal plans, uniform suppliers and similar logistics, please call the office directly so we can give you the most current information:

📞 ${SCHOOL.phone}
✉ ${SCHOOL.email}`
    ),
  },

  // ─── Greeting / chit-chat ──────────────────────────────────────────
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings"],
    answer: () => (
`Hello and welcome to ${SCHOOL.name}! I'm here to help with anything about the school — admissions, programs, fees, tours, contact info, and more.

What would you like to know?`
    ),
  },

  // ─── Thanks ────────────────────────────────────────────────────────
  {
    keywords: ["thank", "thanks", "appreciate", "cheers"],
    answer: () => (
`You're very welcome! Anything else I can help with? You can also reach the office directly on ${SCHOOL.phone} or ${SCHOOL.email}.`
    ),
  },
];

/**
 * Try to match the user's question against the FAQ. Returns a Markdown
 * answer when something fits, or null when nothing matches (caller
 * decides on a generic fallback).
 */
export function staticFaqAnswer(question: string): string | null {
  const q = question.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some(k => q.includes(k))) {
      return entry.answer();
    }
  }
  return null;
}

/** Generic "I don't know" answer pointing to phone/email. */
export function genericFallback(): string {
  return `I don't have a ready answer for that one — but the school office definitely will. Reach us at:

📞 ${SCHOOL.phone}
✉ ${SCHOOL.email}
📱 WhatsApp: ${SCHOOL.phoneIntl}

You can also tap "Prefer WhatsApp? Tap here →" at the bottom of this chat.`;
}
