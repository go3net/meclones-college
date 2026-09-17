/**
 * Keyword-matched static FAQ. Used as a fallback when ANTHROPIC_API_KEY
 * isn't set on the server (or temporarily unreachable) — the chatbot
 * still answers common questions properly instead of giving up with a
 * generic "call us" stub.
 *
 * Match order matters: more specific patterns first, generic catch-alls
 * last. Each handler returns a Markdown-ish string.
 */

import { PROGRAMS, EXAMS } from "./constants";
import type { SchoolPublic } from "./school-public";

interface FaqEntry {
  /** Lowercase keywords; if ANY appears in the user's question (after
   * lowercasing), the handler fires. */
  keywords: string[];
  answer: (school: SchoolPublic) => string;
}

const FAQ: FaqEntry[] = [
  // ─── Admission ─────────────────────────────────────────────────────
  {
    keywords: ["apply", "application", "admission", "admit", "register", "enrol", "enroll", "intake"],
    answer: (school) => (
`To apply to ${school.shortName}, fill out the online admission form right here on this site — there's an "Apply" link in the top menu, or go directly to ${school.website}/apply.

You'll provide your child's details, your contact info, and previous school. The admissions team usually responds within 24 hours to schedule the entrance assessment.

Questions? Reach the admissions office:
• Email: ${school.admissionsEmail}
• Phone: ${school.phone}`
    ),
  },

  // ─── Fees ──────────────────────────────────────────────────────────
  {
    keywords: ["fee", "fees", "tuition", "cost", "price", "how much", "payment", "pay"],
    answer: (school) => (
`Fees vary by class level and the term. Tuition, development levy, textbook fees and uniforms are billed separately each term.

For the current fee schedule we'd rather quote you the right number for your child's year-group — call the school office directly so we can walk through it:

📞 ${school.phone}
✉ ${school.email}

Once your child is enrolled, you'll pay online via Paystack from the parent portal, or in person at the office (cash, transfer, POS, or cheque). Receipts are issued instantly.`
    ),
  },

  // ─── Programs ──────────────────────────────────────────────────────
  {
    keywords: ["program", "programme", "class", "level", "grade", "subject", "what do you offer", "curriculum"],
    answer: (school) => (
`We run the full six-year Nigerian secondary curriculum:

• **Junior Secondary** — ${PROGRAMS.filter(p => p.startsWith("JSS")).join(", ")}
• **Senior Secondary** — ${PROGRAMS.filter(p => p.startsWith("SS")).join(", ")}

We also prepare students for major exams: ${EXAMS.join(", ")}.

${school.stats.teachers}+ teachers and ${school.stats.yearsExperience} years of teaching experience. Want to discuss a specific subject combination? Call ${school.phone}.`
    ),
  },

  // ─── Tour / visit ──────────────────────────────────────────────────
  {
    keywords: ["tour", "visit", "see the school", "come around", "book", "open day", "inspect"],
    answer: (school) => (
`Yes — we'd love to show you around. Book a school visit on this site (look for the "Book a visit" page in the menu) and pick a slot that works for you.

You can also just walk in during office hours: ${school.hours}.

📞 ${school.phone} to confirm a time
📍 ${school.address}`
    ),
  },

  // ─── Contact / location ────────────────────────────────────────────
  {
    keywords: ["contact", "reach", "call", "phone", "email", "where are you", "location", "address", "where is the school"],
    answer: (school) => (
`You can reach the school office:

📞 ${school.phone}
📱 WhatsApp: ${school.phoneIntl}
✉ ${school.email}
📍 ${school.address}
🕒 ${school.hours}

For admissions specifically: ${school.admissionsEmail}.`
    ),
  },

  // ─── Hours ─────────────────────────────────────────────────────────
  {
    keywords: ["hours", "open", "when do you open", "what time", "office hours", "closed"],
    answer: (school) => (
`School office hours are ${school.hours}.

Outside those hours you can still drop us a WhatsApp on ${school.phoneIntl} or email ${school.email} — someone will respond the next working day.`
    ),
  },

  // ─── Portal / login ────────────────────────────────────────────────
  {
    keywords: ["portal", "login", "log in", "sign in", "parent account", "student account", "password"],
    answer: (school) => (
`Parents, teachers and students sign in at ${school.website}/portal/login.

You can log in with either your email OR your admission number (for students). Forgot your password? There's a "Forgot password?" link on the login page — we'll email you a reset link.

If you've never received your login details, call ${school.phone} and we'll set you up.`
    ),
  },

  // ─── Results / fees / attendance — specific child ──────────────────
  {
    keywords: ["my child", "my son", "my daughter", "result", "attendance", "score", "report card"],
    answer: (school) => (
`For your child's specific records — results, attendance, fee balance, term reports — please log in to the parent portal at ${school.website}/portal/login.

If you haven't been issued portal credentials yet, call ${school.phone} or email ${school.admissionsEmail} and we'll get you set up.`
    ),
  },

  // ─── Boarding / transport / meals ──────────────────────────────────
  {
    keywords: ["boarding", "transport", "bus", "meal", "food", "lunch", "uniform", "hostel"],
    answer: (school) => (
`For specifics on boarding, bus routes, meal plans, uniform suppliers and similar logistics, please call the office directly so we can give you the most current information:

📞 ${school.phone}
✉ ${school.email}`
    ),
  },

  // ─── Greeting / chit-chat ──────────────────────────────────────────
  {
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "greetings"],
    answer: (school) => (
`Hello and welcome to ${school.name}! I'm here to help with anything about the school — admissions, programs, fees, tours, contact info, and more.

What would you like to know?`
    ),
  },

  // ─── Thanks ────────────────────────────────────────────────────────
  {
    keywords: ["thank", "thanks", "appreciate", "cheers"],
    answer: (school) => (
`You're very welcome! Anything else I can help with? You can also reach the office directly on ${school.phone} or ${school.email}.`
    ),
  },
];

/**
 * Try to match the user's question against the FAQ. Returns a Markdown
 * answer when something fits, or null when nothing matches (caller
 * decides on a generic fallback).
 */
export function staticFaqAnswer(question: string, school: SchoolPublic): string | null {
  const q = question.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some(k => q.includes(k))) {
      return entry.answer(school);
    }
  }
  return null;
}

/** Generic "I don't know" answer pointing to phone/email. */
export function genericFallback(school: SchoolPublic): string {
  return `I don't have a ready answer for that one — but the school office definitely will. Reach us at:

📞 ${school.phone}
✉ ${school.email}
📱 WhatsApp: ${school.phoneIntl}

You can also tap "Prefer WhatsApp? Tap here →" at the bottom of this chat.`;
}
