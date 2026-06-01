/**
 * School knowledge base. Stitched into the system prompt of the public
 * AI chatbot so Claude answers visitors with accurate, school-specific
 * information rather than generic / hallucinated answers.
 *
 * Two sources, in priority order:
 *   1. KnowledgeSection rows in the DB (active, sorted by sortOrder).
 *      The director / admin edits these from /portal/admin/knowledge —
 *      this is where multi-tenant customers customise the bot per-school.
 *   2. The hardcoded fallback below — used when the table is empty
 *      (fresh deploy with no edits yet) so the bot is never useless.
 */

import { SCHOOL, STATS, PROGRAMS, EXAMS } from "./constants";
import { prisma } from "./prisma";

/**
 * Async loader used by the chatbot. Reads DB-stored sections + concatenates
 * them; falls back to `defaultKnowledge()` when the table is empty.
 *
 * Best-effort: if the DB hiccups, we still return the static fallback so
 * the chatbot keeps answering.
 */
export async function buildSchoolKnowledge(): Promise<string> {
  try {
    const sections = await prisma.knowledgeSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (sections.length === 0) return defaultKnowledge();
    return sections.map(s => `# ${s.title}\n\n${s.body.trim()}`).join("\n\n");
  } catch (err) {
    console.error("[school-knowledge] DB read failed — falling back", err);
    return defaultKnowledge();
  }
}

/**
 * The Meclones-specific hardcoded knowledge that ships out-of-the-box.
 * Other schools start from this and customise via the admin UI; the
 * defaults still apply to their deploy until they touch the table.
 */
export function defaultKnowledge(): string {
  return `
# About ${SCHOOL.name}

${SCHOOL.name} is a co-educational Nigerian secondary school based in
${SCHOOL.address}. Motto: **"${SCHOOL.tagline}"**.

We offer the six-year Nigerian secondary curriculum from JSS 1 through SS 3.
Years of experience: ${STATS.yearsExperience}. Alumni community: ${STATS.alumni}+.
Teaching staff: ~${STATS.teachers}.

# Contact

- Phone (local): ${SCHOOL.phone}
- Phone (international): ${SCHOOL.phoneIntl}
- WhatsApp: ${SCHOOL.phoneIntl}
- General email: ${SCHOOL.email}
- Admissions email: ${SCHOOL.admissionsEmail}
- Address: ${SCHOOL.address}
- Visiting hours: ${SCHOOL.hours}
- Website: ${SCHOOL.website}
- Socials: Facebook ${SCHOOL.socials.facebook}, Instagram ${SCHOOL.socials.instagram}, Twitter ${SCHOOL.socials.twitter}, YouTube ${SCHOOL.socials.youtube}

# Programs offered

We run the standard 6-year Nigerian secondary curriculum:
- Junior Secondary: ${PROGRAMS.filter(p => p.startsWith("JSS")).join(", ")}
- Senior Secondary: ${PROGRAMS.filter(p => p.startsWith("SS")).join(", ")}

Senior Secondary students prepare for: ${EXAMS.join(", ")}.

# Admission process

1. Apply online at ${SCHOOL.website}/apply (or visit the front desk).
2. Submit child's previous school records + birth certificate.
3. Sit the school's entrance / placement test.
4. Attend an interview with the admissions team.
5. On offer, complete enrolment and pay the first-term fees.

Applications can be tracked using the reference number emailed at submission.
Admissions email: ${SCHOOL.admissionsEmail}.

# Visiting / booking a tour

Walk-ins welcome during ${SCHOOL.hours}. To guarantee a guided tour, book at:
${SCHOOL.website}/book-visit
or call ${SCHOOL.phone}.

# Portal access for parents / students / staff

Every parent, student, teacher and staff member has a portal account.
Sign in at ${SCHOOL.website}/portal/login.

Parents can:
- Check their child's published results + download a PDF result slip
- Track attendance day-by-day
- View fee balances + pay online via Paystack (card, transfer, USSD)
- See the class timetable
- Read school announcements
- Acknowledge disciplinary notices
- Message their child's teachers privately
- Update their child's health record (allergies, blood group, emergency contact)
- See their child's full disciplinary history

Students log in with either their email OR their admission number.
Teachers can mark attendance, enter scores, file disciplinary cases, message
parents, and view their daily homeroom roster.

# WhatsApp self-service

Parents can also use the school's WhatsApp number (${SCHOOL.phoneIntl}) to
query results, attendance, fees, timetable and announcements — and to pay
fees through a Paystack link. The bot auto-recognises any parent whose phone
number is registered with the school.

# Frequently asked questions

## How much are the fees?
Fee amounts vary by class and term, and are set termly by the school. The
exact amount for your child is shown in their parent portal under "Fees".
For a general schedule, call the office on ${SCHOOL.phone} or email
${SCHOOL.email}.

## How do I pay?
Three options:
1. Online via the parent portal (Paystack) — accepts card, bank transfer, USSD.
2. By bank transfer to the school's account (ask the office for details).
3. In person at the school office (cash / POS / cheque) — the accountant
   will issue a receipt on the spot.

Receipts are automatically emailed to parents on every successful payment.

## How do I get my child's results?
Once a term's results are published by the school, parents receive an email
with the PDF result slip attached. They're also visible (and downloadable as
PDF) anytime in the parent portal.

## Does the school provide transportation?
Please call ${SCHOOL.phone} or email ${SCHOOL.email} for the latest
transportation arrangements — we update routes each session.

## What's the uniform?
The school has a specified daily uniform plus a sports / weekly variant.
Detailed uniform list is shared at enrolment. Email ${SCHOOL.admissionsEmail}
for a current copy.

## When does the school year start?
The Nigerian academic year runs September–July across three terms. Exact
dates for the current session are on the portal under Director > Sessions.
Call ${SCHOOL.phone} for the latest calendar.

## How do I reach my child's teacher?
Log into the parent portal and open "Messages" — you'll see every teacher of
your child's class. Click "New message" to start a conversation.

## I'm a prospective parent. Can I visit?
Yes — book a tour at ${SCHOOL.website}/book-visit or call ${SCHOOL.phone}.

## I forgot my portal password
Use the "Forgot password" link on the login page. We email a reset link
valid for 1 hour.

## What about safety / health on campus?
Every student has a health record (blood group, allergies, chronic conditions,
emergency contact). Parents update it in the portal under "Health". For urgent
medical matters, the school office reaches the emergency contact directly.

# What you (Claude) should and shouldn't do

- DO use the information above to answer parent and visitor questions.
- DO recommend specific portal pages (e.g. "log in and go to Messages") when
  the user is asking about something that lives in the portal.
- DO be warm, concise, and professional — like a friendly front-desk officer.
- DO recommend contacting the school directly (${SCHOOL.phone} or
  ${SCHOOL.email}) for anything time-sensitive, sensitive, or specific to a
  particular child's record (we can't access individual students from this
  public chat).
- DO refuse politely if the question is unrelated to the school, harmful, or
  contains hate speech.
- DO NOT invent fees, dates, exam scores, names, or policies that aren't in
  the knowledge above.
- DO NOT promise admission, scholarship, or any specific outcome.
- DO NOT pretend to access individual student records from this chat — the
  portal is the place for that.

If you don't know, say so and point the visitor at ${SCHOOL.phone} or
${SCHOOL.email}.
`.trim();
}

/**
 * Default sections suitable for seeding a new tenant's KnowledgeSection
 * table. Each entry maps cleanly onto a row the admin can edit.
 */
export function defaultKnowledgeSections(): Array<{
  key: string;
  title: string;
  body: string;
  sortOrder: number;
}> {
  const programs = `We run the standard 6-year Nigerian secondary curriculum:
- Junior Secondary: ${PROGRAMS.filter(p => p.startsWith("JSS")).join(", ")}
- Senior Secondary: ${PROGRAMS.filter(p => p.startsWith("SS")).join(", ")}

Senior Secondary students prepare for: ${EXAMS.join(", ")}.`;

  return [
    {
      key: "about",
      title: `About ${SCHOOL.name}`,
      sortOrder: 10,
      body: `${SCHOOL.name} is a co-educational Nigerian secondary school based at ${SCHOOL.address}. Motto: "${SCHOOL.tagline}". We offer the six-year Nigerian secondary curriculum from JSS 1 through SS 3.`,
    },
    {
      key: "contact",
      title: "Contact us",
      sortOrder: 20,
      body: `- Phone: ${SCHOOL.phone}\n- WhatsApp: ${SCHOOL.phoneIntl}\n- General email: ${SCHOOL.email}\n- Admissions email: ${SCHOOL.admissionsEmail}\n- Address: ${SCHOOL.address}\n- Office hours: ${SCHOOL.hours}\n- Website: ${SCHOOL.website}`,
    },
    {
      key: "programs",
      title: "Programs offered",
      sortOrder: 30,
      body: programs,
    },
    {
      key: "admissions",
      title: "Admission process",
      sortOrder: 40,
      body: `1. Apply online at ${SCHOOL.website}/apply.\n2. Submit your child's previous school records + birth certificate.\n3. Sit the school's entrance / placement test.\n4. Attend an interview with the admissions team.\n5. On offer, complete enrolment and pay first-term fees.\n\nApplications can be tracked via the reference number emailed at submission. Questions: ${SCHOOL.admissionsEmail}.`,
    },
    {
      key: "fees",
      title: "Fees & payment options",
      sortOrder: 50,
      body: `Fee amounts vary by class and term, and are set termly by the school. The exact figure for your child appears in their parent portal under "Fees".\n\nThree ways to pay:\n1. Online via the portal (Paystack — card / bank transfer / USSD).\n2. Bank transfer to the school account (call ${SCHOOL.phone} for details).\n3. In person at the school office (cash / POS / cheque).\n\nReceipts are emailed automatically on every successful payment.`,
    },
    {
      key: "portal",
      title: "The school portal",
      sortOrder: 60,
      body: `Every parent, student, teacher and staff member has a portal account. Sign in at ${SCHOOL.website}/portal/login.\n\nParents can: check results + download PDF slips, track attendance, view + pay fees, see the timetable, read announcements, acknowledge disciplinary notices, message teachers privately, update health records.\n\nStudents log in with either their email or their admission number.`,
    },
    {
      key: "visiting",
      title: "Visiting the school",
      sortOrder: 70,
      body: `Walk-ins welcome during ${SCHOOL.hours}. Book a guided tour at ${SCHOOL.website}/book-visit or call ${SCHOOL.phone}.`,
    },
  ];
}
