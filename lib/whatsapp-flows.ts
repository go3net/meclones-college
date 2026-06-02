import type { WhatsMsg } from "@/components/WhatsAppMockup";

/**
 * Six canonical WhatsApp conversation flows used on /whatsapp,
 * /for-schools, and the sample school sites. These ARE the product
 * pitch — every flow shown here matches a real bot capability we
 * either ship today or are building over the next sprint.
 */

export interface WhatsFlow {
  slug: string;
  title: string;
  oneLiner: string;
  role: "parent" | "teacher" | "admin";
  peerName: string;
  peerMonogram: string;
  peerAvatarColor: string;
  /** Headline of what this flow lets the user do. */
  takeaway: string;
  messages: WhatsMsg[];
}

export const WHATSAPP_FLOWS: WhatsFlow[] = [
  // 1. Parent pays fees
  {
    slug: "parent-pay-fees",
    title: "Parent pays school fees",
    oneLiner: "Two messages and a tap. Receipt arrives as a PDF.",
    role: "parent",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "No portal login. No app to install. The parent never even needs to know the school has a portal.",
    messages: [
      { kind: "system", text: "Today" },
      { kind: "text", from: "out", text: "Hi, I want to pay Daniel's fees", time: "8:14" },
      {
        kind: "text",
        from: "in",
        text:
          "Welcome back, Mrs. Okafor 👋\n\nI see you have 2 children at Falcon: Daniel (SS 2A) and Adaeze (JSS 3B). Whose fees?",
        time: "8:14",
      },
      {
        kind: "buttons",
        from: "in",
        text: "Tap a name to see outstanding balance:",
        buttons: ["Daniel — SS 2A", "Adaeze — JSS 3B", "Both children"],
        time: "8:14",
      },
      { kind: "text", from: "out", text: "Daniel", time: "8:15" },
      {
        kind: "text",
        from: "in",
        text:
          "Daniel Okafor — SS 2A\n\nTerm 2 outstanding: ₦ 125,000\n\nBreakdown:\n• Tuition: ₦ 95,000\n• Boarding: ₦ 25,000\n• Lab levy: ₦ 5,000",
        time: "8:15",
      },
      {
        kind: "buttons",
        from: "in",
        text: "Ready to pay?",
        buttons: ["Pay ₦ 125,000 via Paystack", "Pay part-payment", "Email me the bill"],
        time: "8:15",
      },
      { kind: "text", from: "out", text: "Pay ₦ 125,000 via Paystack", time: "8:15" },
      {
        kind: "text",
        from: "in",
        text:
          "Tap to pay securely on Paystack:\n\n🔗 paystack.com/falcon/p2-daniel-okafor\n\nLink valid for 24 hours.",
        time: "8:16",
      },
      { kind: "system", text: "Paystack payment completed · ₦ 125,000" },
      {
        kind: "text",
        from: "in",
        text: "Payment received. Receipt below 👇",
        time: "8:18",
      },
      {
        kind: "attachment",
        from: "in",
        kind2: "pdf",
        label: "Receipt-DanielOkafor-2026T2.pdf",
        sub: "47 KB · Falcon Academy",
        time: "8:18",
      },
    ],
  },

  // 2. Parent checks results
  {
    slug: "parent-check-results",
    title: "Parent checks the term's results",
    oneLiner: "Term result slip as a PDF, 12 seconds after asking.",
    role: "parent",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "Result slips with class teacher and principal comments, sent the moment the parent asks — not when they remember to log in.",
    messages: [
      { kind: "system", text: "Tuesday" },
      { kind: "text", from: "out", text: "Adaeze's results please", time: "19:02" },
      {
        kind: "text",
        from: "in",
        text:
          "Adaeze Okafor — JSS 3B\nTerm 2 results were published on Monday.\n\nClass position: 4 of 31\nClass average: 68% · Adaeze: 79%",
        time: "19:02",
      },
      {
        kind: "buttons",
        from: "in",
        text: "Want the full slip?",
        buttons: ["Send PDF slip", "See subject breakdown", "Message form teacher"],
        time: "19:02",
      },
      { kind: "text", from: "out", text: "Send PDF slip", time: "19:03" },
      {
        kind: "attachment",
        from: "in",
        kind2: "pdf",
        label: "AdaezeOkafor-JSS3B-T2-2026.pdf",
        sub: "82 KB · Falcon Academy",
        time: "19:03",
      },
      {
        kind: "text",
        from: "in",
        text:
          "✨ Class teacher comment:\n\n\"Adaeze has shown excellent focus this term, particularly in English Literature. Continue to work on showing your full method in Mathematics.\"\n— Mrs. Ada Nwosu",
        time: "19:03",
      },
    ],
  },

  // 3. Teacher marks attendance
  {
    slug: "teacher-attendance",
    title: "Teacher marks the class register",
    oneLiner: "Tap the absent students. Done in under a minute.",
    role: "teacher",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "No tablet. No PC. The form teacher takes register from her phone while walking the classroom — parents of absent students are notified automatically.",
    messages: [
      { kind: "system", text: "Today · 8:02" },
      { kind: "text", from: "out", text: "attendance", time: "8:02" },
      {
        kind: "buttons",
        from: "in",
        text: "Hi Mrs. Nwosu 👋\nWhich class are you taking register for?",
        buttons: ["JSS 3B (your homeroom)", "SS 1A Literature", "SS 2A Literature"],
        time: "8:02",
      },
      { kind: "text", from: "out", text: "JSS 3B", time: "8:02" },
      {
        kind: "list",
        from: "in",
        header: "JSS 3B · 31 students. Tap each absent student. Tap 'Done' when finished.",
        items: [
          { title: "1. Adaeze Okafor" },
          { title: "2. Ayomide Bello" },
          { title: "3. Chidi Nwankwo  ❌ marked absent" },
          { title: "4. Damilola Lawal" },
          { title: "5. Emeka Onyema" },
          { title: "6. Faridah Ibrahim  ❌ marked absent" },
          { title: "7. Funmi Adeolu" },
          { title: "8. Gbenga Olajide" },
          { title: "…" },
          { title: "✅ Done — submit register" },
        ],
        time: "8:03",
      },
      { kind: "text", from: "out", text: "Done", time: "8:04" },
      {
        kind: "text",
        from: "in",
        text:
          "✅ Register saved for JSS 3B\n\nPresent: 29\nAbsent: 2 (Chidi, Faridah)\n\nParents of Chidi and Faridah have been notified by WhatsApp. Both replied with reasons within 4 minutes.",
        time: "8:04",
      },
    ],
  },

  // 4. Teacher enters scores
  {
    slug: "teacher-scores",
    title: "Teacher enters term scores",
    oneLiner: "Subject by subject, walking home from school.",
    role: "teacher",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "Score entry that used to mean a full Saturday with a laptop becomes a 4-minute conversation while the kettle boils.",
    messages: [
      { kind: "system", text: "Today · 17:42" },
      { kind: "text", from: "out", text: "I want to enter scores", time: "17:42" },
      {
        kind: "buttons",
        from: "in",
        text: "Which subject + class, Mr. Bello?",
        buttons: ["Biology — SS 2A", "Biology — SS 2B", "Pick another"],
        time: "17:42",
      },
      { kind: "text", from: "out", text: "Biology SS 2A", time: "17:42" },
      {
        kind: "buttons",
        from: "in",
        text: "Biology · SS 2A · 28 students.\nWhich assessment?",
        buttons: ["CA1 (20)", "CA2 (20)", "Exam (60)"],
        time: "17:43",
      },
      { kind: "text", from: "out", text: "Exam", time: "17:43" },
      {
        kind: "text",
        from: "in",
        text:
          "OK. Send me scores. Either:\n\n(A) One per line, like:\n  Olu 48\n  Ada 52\n  …\n\n(B) Or just type each name and I'll ask for the score.",
        time: "17:43",
      },
      {
        kind: "text",
        from: "out",
        text:
          "Olu 48\nAda 52\nKemi 41\nTobi 55\nFunmi 58\nNkechi 49\nBayo 47",
        time: "17:46",
      },
      {
        kind: "text",
        from: "in",
        text:
          "Got 7 scores. Saved as draft.\n\nKemi's score (41/60 = 68%) is her lowest this term — flagged for review on the portal. Continue when ready 👇",
        time: "17:46",
      },
      {
        kind: "buttons",
        from: "in",
        text: " ",
        buttons: ["Send next 7", "I'm done — publish", "Save & continue tomorrow"],
        time: "17:46",
      },
    ],
  },

  // 5. Parent messages a specific teacher
  {
    slug: "parent-message-teacher",
    title: "Parent messages a teacher",
    oneLiner: "Threaded into the portal. Teacher replies from her own WhatsApp.",
    role: "parent",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "Parents don't need to know teachers' personal numbers. Every message is logged in the portal — no off-record chats.",
    messages: [
      { kind: "system", text: "Yesterday" },
      {
        kind: "text",
        from: "out",
        text: "I want to send a message to Daniel's Maths teacher please",
        time: "21:12",
      },
      {
        kind: "buttons",
        from: "in",
        text:
          "Daniel's SS 2A Maths teacher is Mr. Tunde Fashina.\nWant me to forward a message to him?",
        buttons: ["Yes — type message", "Schedule a meeting instead", "Cancel"],
        time: "21:12",
      },
      { kind: "text", from: "out", text: "Yes", time: "21:13" },
      {
        kind: "text",
        from: "in",
        text:
          "Go ahead — type your message. You can also send photos or PDFs. I'll deliver it to Mr. Fashina and let you know when he replies.",
        time: "21:13",
      },
      {
        kind: "text",
        from: "out",
        text:
          "Hello sir, Daniel mentioned he found Friday's quadratic equations test difficult. Could you suggest practice material he can work through this weekend?",
        time: "21:14",
      },
      {
        kind: "text",
        from: "in",
        text:
          "Forwarded to Mr. Fashina. He's marked it received.",
        time: "21:14",
      },
      { kind: "system", text: "Today · 08:31" },
      {
        kind: "text",
        from: "in",
        text:
          "📩 Reply from Mr. Tunde Fashina (SS 2A Maths):\n\n\"Good morning. Yes — I noticed Daniel paused on Q4 and Q7. Please ask him to redo Exercise 11B in the Macmillan textbook this weekend and I'll review with him on Monday before assembly.\"",
        time: "8:31",
      },
    ],
  },

  // 6. Teacher logs disciplinary incident
  {
    slug: "teacher-incident",
    title: "Teacher logs a disciplinary incident",
    oneLiner: "Three taps. Parent acknowledges from her end.",
    role: "teacher",
    peerName: "Falcon Academy",
    peerMonogram: "F",
    peerAvatarColor: "#0F172A",
    takeaway:
      "Incidents that used to live on Post-It notes are now searchable, severity-tagged, and parent-acknowledged — without anyone touching a portal.",
    messages: [
      { kind: "system", text: "Today · 11:45" },
      { kind: "text", from: "out", text: "log incident", time: "11:45" },
      {
        kind: "text",
        from: "in",
        text: "OK Mrs. Nwosu. Which student?",
        time: "11:45",
      },
      { kind: "text", from: "out", text: "chidi nwankwo jss3b", time: "11:46" },
      {
        kind: "buttons",
        from: "in",
        text: "Chidi Nwankwo · JSS 3B. Type of incident?",
        buttons: ["Behaviour in class", "Uniform / lateness", "Bullying / safeguarding"],
        time: "11:46",
      },
      { kind: "text", from: "out", text: "Behaviour in class", time: "11:46" },
      {
        kind: "text",
        from: "in",
        text: "Tell me what happened — in your own words.",
        time: "11:46",
      },
      {
        kind: "text",
        from: "out",
        text:
          "Disrupted English lesson twice. Asked to step out. Returned 5 minutes later and was settled.",
        time: "11:47",
      },
      {
        kind: "buttons",
        from: "in",
        text: "Severity?",
        buttons: ["Minor (verbal warning)", "Moderate (letter to parent)", "Serious (escalate)"],
        time: "11:47",
      },
      { kind: "text", from: "out", text: "Minor", time: "11:47" },
      {
        kind: "text",
        from: "in",
        text:
          "✅ Incident logged · Reference INC-2026-0341\n\n• Severity: Minor\n• Sanction: Verbal warning\n• Logged: 11:47, Mrs. A. Nwosu\n\nChidi's parents (Mr. & Mrs. Nwankwo) have been notified for acknowledgement.",
        time: "11:47",
      },
      { kind: "system", text: "Parent acknowledged · 12:14" },
    ],
  },
];

export function getFlow(slug: string): WhatsFlow | undefined {
  return WHATSAPP_FLOWS.find(f => f.slug === slug);
}
