/**
 * Sample school definitions for /showcase.
 *
 * Each entry is a fully fictional school used as a sales demo so
 * prospects can click around a real-looking site styled differently
 * from every other prospect's site. The whole point of having three
 * is to communicate: "your site would be custom-built; this is
 * just one direction of many."
 *
 * Adding a new sample? Drop another entry here, add a "Home"-style
 * personality flag if needed, and the [school]/page.tsx renderer
 * picks it up automatically.
 */

export type SampleHeroStyle = "fullbleed-dark" | "split-warm" | "minimal-light";
export type SampleVibe = "modern" | "classical" | "premium";

export interface SampleSchool {
  slug: string;
  name: string;
  shortName: string;
  monogram: string;
  tagline: string;
  established: string;
  city: string;
  state: string;
  /** Hero ladder copy used on home + admissions */
  pitch: string;
  /** A single sentence used on the showcase index card */
  cardBlurb: string;
  vibe: SampleVibe;
  heroStyle: SampleHeroStyle;
  theme: {
    /** Primary brand colour for header, CTAs, links */
    primary: string;
    /** Accent for highlights, ribbons */
    accent: string;
    /** Background for the page body */
    bg: string;
    /** Body text colour */
    text: string;
    /** Subtle surface colour for cards / footer */
    surface: string;
    /** Text colour on top of the primary colour */
    onPrimary: string;
    /** Heading font family — uses Tailwind utilities */
    headingClass: string;
    /** Body font family */
    bodyClass: string;
  };
  contact: {
    addressLines: string[];
    phone: string;
    email: string;
    hours: string;
  };
  programs: Array<{ title: string; body: string }>;
  achievements: Array<{ label: string; value: string }>;
  values: Array<{ title: string; body: string }>;
  admissionsSteps: Array<{ step: string; title: string; body: string }>;
  newsItems: Array<{ date: string; title: string; teaser: string }>;
}

export const SAMPLE_SCHOOLS: SampleSchool[] = [
  // -----------------------------------------------------------
  // 1. Falcon Academy — modern, tech-forward, ambitious
  // -----------------------------------------------------------
  {
    slug: "falcon-academy",
    name: "Falcon Academy",
    shortName: "Falcon",
    monogram: "F",
    tagline: "Where ambition takes flight",
    established: "Established 2009",
    city: "Lekki",
    state: "Lagos",
    pitch:
      "A modern co-educational secondary school for ambitious learners. STEM-anchored curriculum, project-based assessment, and a culture that celebrates curiosity.",
    cardBlurb: "Modern, ambitious, STEM-anchored — for the school that wants a sharp, contemporary brand.",
    vibe: "modern",
    heroStyle: "fullbleed-dark",
    theme: {
      primary: "#0F172A",
      accent: "#E11D48",
      bg: "#FFFFFF",
      text: "#0F172A",
      surface: "#F8FAFC",
      onPrimary: "#FFFFFF",
      headingClass: "font-sans font-extrabold tracking-tight",
      bodyClass: "font-sans",
    },
    contact: {
      addressLines: ["12 Admiralty Way", "Lekki Phase 1, Lagos"],
      phone: "0809 555 0101",
      email: "admissions@falconacademy.ng",
      hours: "Mon – Fri · 7:30am – 4:30pm",
    },
    programs: [
      { title: "JSS · Foundations", body: "A six-subject core (Maths, English, Sciences, Coding, Civics, French) anchored by weekly research labs." },
      { title: "SSS · Specialisation", body: "Pick a track — Pure Sciences, Tech & Engineering, or Commercial — taught by subject specialists." },
      { title: "Robotics & AI Club", body: "After-school deep dive. State-level championships in 3 of the last 4 years." },
      { title: "Cambridge Prep", body: "Optional IGCSE / A-Level prep stream for students applying internationally." },
    ],
    achievements: [
      { label: "WAEC distinction rate", value: "84%" },
      { label: "Student–teacher ratio", value: "12:1" },
      { label: "Universities matriculated to", value: "47" },
      { label: "Robotics state titles", value: "3" },
    ],
    values: [
      { title: "Make something every week", body: "Every student ships a small project — a circuit, an essay, a presentation — every single week." },
      { title: "Ask the second question", body: "We reward students who don't stop at the first answer. Curiosity is graded." },
      { title: "Own your work", body: "Portfolios go with you when you graduate. Everything you build here is yours." },
    ],
    admissionsSteps: [
      { step: "01", title: "Submit enquiry", body: "Tell us about your child. We respond within 24 hours with a tour invitation." },
      { step: "02", title: "Campus visit + assessment", body: "30-minute campus tour followed by a 60-minute placement assessment covering Maths, English, and reasoning." },
      { step: "03", title: "Interview", body: "A relaxed conversation with the principal and head of academics. Parents are encouraged to attend." },
      { step: "04", title: "Offer + onboarding", body: "Offers go out within 3 working days. Accept your place and we'll send the new-student handbook." },
    ],
    newsItems: [
      { date: "Feb 24", title: "Robotics team takes silver at Lagos State Open", teaser: "Our SS 2 team built a line-following bot in 48 hours — finishing second across 41 entries." },
      { date: "Feb 11", title: "Term 2 parent-teacher conferences scheduled", teaser: "Sign-up window opens Monday. Slots are 20 minutes, in person or on Zoom." },
      { date: "Jan 29", title: "Coding Olympiad — three Falcon students through to nationals", teaser: "Daniel (SS 1), Adaeze (JSS 3), and Tobi (SS 2) all advanced from the Lagos qualifier." },
    ],
  },

  // -----------------------------------------------------------
  // 2. Sunrise Preparatory School — traditional, warm, classical
  // -----------------------------------------------------------
  {
    slug: "sunrise-prep",
    name: "Sunrise Preparatory School",
    shortName: "Sunrise Prep",
    monogram: "S",
    tagline: "Nurturing tomorrow's leaders since 1992",
    established: "Established 1992",
    city: "Ibadan",
    state: "Oyo",
    pitch:
      "A traditional co-educational boarding and day school grounded in character, scholarship, and service. Over three decades of forming young women and men who lead with integrity.",
    cardBlurb: "Traditional, warm, character-led — for the school that leans on heritage and serif typography.",
    vibe: "classical",
    heroStyle: "split-warm",
    theme: {
      primary: "#166534",
      accent: "#D97706",
      bg: "#FFFBEB",
      text: "#1F2937",
      surface: "#FEF3C7",
      onPrimary: "#FEFCE8",
      headingClass: "font-serif font-bold tracking-tight",
      bodyClass: "font-serif",
    },
    contact: {
      addressLines: ["Plot 7, Ring Road Layout", "Ibadan, Oyo State"],
      phone: "0803 444 0202",
      email: "admissions@sunriseprep.ng",
      hours: "Mon – Fri · 8:00am – 4:00pm",
    },
    programs: [
      { title: "Junior School (JSS 1–3)", body: "Broad foundation in the humanities and sciences, with daily reading, weekly chapel, and house-based pastoral care." },
      { title: "Senior School (SSS 1–3)", body: "Choose Sciences, Commercial, or Arts. Small class sizes, traditional examinations, university preparation from SS 1." },
      { title: "Boarding life", body: "Single-sex residences with resident matrons. Evening prep, weekend recreation, and Sunday chapel form the rhythm." },
      { title: "Arts & service", body: "Choir, debate, drama, and our long-standing community service programme in surrounding villages." },
    ],
    achievements: [
      { label: "Years of service", value: "33" },
      { label: "Alumni in leadership", value: "1,400+" },
      { label: "Boarding capacity", value: "320" },
      { label: "Scholarship places / year", value: "12" },
    ],
    values: [
      { title: "Character first", body: "We grade conduct alongside scholarship. A first-class mind without character is half an education." },
      { title: "Scholarship with depth", body: "Read widely, write often, argue your case. Memorisation is a tool, not a goal." },
      { title: "Service as habit", body: "Every senior student commits to a community project. It's not optional — it's part of who we are." },
    ],
    admissionsSteps: [
      { step: "I", title: "Request the prospectus", body: "Call or write to the registrar. We post or email a full prospectus and application form." },
      { step: "II", title: "Open day attendance", body: "Families are warmly invited to one of our termly open days. Tour the campus, meet teachers, hear the choir." },
      { step: "III", title: "Common Entrance + interview", body: "Candidates sit a written Common Entrance examination. A family interview follows for shortlisted candidates." },
      { step: "IV", title: "Offer + matriculation", body: "Successful applicants are formally matriculated at the start of the academic session. Boarding placements are confirmed in June." },
    ],
    newsItems: [
      { date: "Feb 22", title: "Founder's Day address — 33 years of Sunrise", teaser: "The Headmistress reflected on three decades of formation and the alumni who now lead across West Africa." },
      { date: "Feb 04", title: "Inter-house debate finals — Stuart House triumphs", teaser: "A spirited contest on the motion: 'Tradition serves the future more faithfully than innovation does.'" },
      { date: "Jan 20", title: "Senior School chapel choir tours Lagos", teaser: "Three concerts in aid of the bursary programme. Tickets available through the bursar's office." },
    ],
  },

  // -----------------------------------------------------------
  // 3. Northgate International — premium, minimalist, Cambridge
  // -----------------------------------------------------------
  {
    slug: "northgate-international",
    name: "Northgate International School",
    shortName: "Northgate",
    monogram: "N",
    tagline: "British curriculum. Nigerian heart.",
    established: "Established 2014",
    city: "Abuja",
    state: "FCT",
    pitch:
      "An international school delivering the full Cambridge pathway — Primary, Lower Secondary, IGCSE, and A-Level — to families who want a globally portable education without leaving Nigeria.",
    cardBlurb: "Minimalist, premium, Cambridge pathway — for the school positioning itself at the top of the market.",
    vibe: "premium",
    heroStyle: "minimal-light",
    theme: {
      primary: "#18181B",
      accent: "#CA8A04",
      bg: "#FFFFFF",
      text: "#27272A",
      surface: "#FAFAFA",
      onPrimary: "#FFFFFF",
      headingClass: "font-sans font-light tracking-tight",
      bodyClass: "font-sans font-light",
    },
    contact: {
      addressLines: ["No. 4 Northgate Drive", "Maitama, Abuja FCT"],
      phone: "0807 333 0303",
      email: "admissions@northgate-int.ng",
      hours: "Mon – Fri · 8:00am – 5:00pm",
    },
    programs: [
      { title: "Cambridge Lower Secondary", body: "Years 7–9 (JSS equivalent). Checkpoint examinations in Maths, English, and Science at the end of Year 9." },
      { title: "Cambridge IGCSE", body: "Years 10–11. Students select eight subjects from a broad curriculum and sit external examinations." },
      { title: "Cambridge A-Level", body: "Years 12–13. Three or four subject specialisations preparing for direct entry into UK, Canadian, and US universities." },
      { title: "WAEC bridge stream", body: "An optional parallel stream for students wishing to keep Nigerian university options open alongside the Cambridge pathway." },
    ],
    achievements: [
      { label: "A* / A grades at A-Level", value: "62%" },
      { label: "Universities accepted to (UK)", value: "Russell Group" },
      { label: "Average class size", value: "14" },
      { label: "Faculty with Master's+", value: "78%" },
    ],
    values: [
      { title: "Excellence, quietly", body: "We don't shout about results. We measure ourselves against the best schools in the world and act accordingly." },
      { title: "Globally portable", body: "A Northgate education travels. Our graduates matriculate at universities across four continents." },
      { title: "Rooted in Nigeria", body: "Cambridge curriculum, Nigerian context. We teach Yoruba, Igbo, Hausa, and Civics alongside the international syllabus." },
    ],
    admissionsSteps: [
      { step: "01", title: "Initial enquiry", body: "Submit an enquiry form. The admissions office responds with a registration pack within 48 hours." },
      { step: "02", title: "Registration & reference", body: "Complete the registration form and arrange for the candidate's current school to send a confidential reference." },
      { step: "03", title: "Assessment day", body: "Candidates sit subject assessments in English, Mathematics, and reasoning. Senior School applicants also complete a subject-specific paper." },
      { step: "04", title: "Place confirmation", body: "Successful applicants receive a letter of offer. Places are confirmed upon payment of the registration deposit." },
    ],
    newsItems: [
      { date: "Feb 26", title: "Year 13 receives early UCAS offers", teaser: "Eight conditional offers from Russell Group institutions, including two from Oxford and Cambridge." },
      { date: "Feb 15", title: "Northgate hosts FCT Schools Maths Challenge", teaser: "180 students from 22 schools competed across three age categories. Our Year 10 team placed third overall." },
      { date: "Feb 02", title: "Faculty welcomes Dr. Akande as Head of Sciences", teaser: "Dr. Akande joins us from a senior research role at a leading Lagos university, with a doctorate in molecular biology." },
    ],
  },
];

export function getSampleSchool(slug: string): SampleSchool | undefined {
  return SAMPLE_SCHOOLS.find(s => s.slug === slug);
}
