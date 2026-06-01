/**
 * Sample school definitions for /showcase.
 *
 * Each entry is a fully fictional school used as a sales demo so
 * prospects can click around a real-looking site styled differently
 * from every other prospect's site. The whole point of having three
 * is to communicate: "your site would be custom-built; this is
 * just one direction of many."
 *
 * Depth target = parity with the real Meclones public site:
 * rich photography, faculty showcase, multi-photo programs,
 * Instagram-style gallery, news, testimonials with headshots.
 */

export type SampleHeroStyle = "fullbleed-dark" | "split-warm" | "minimal-light";
export type SampleVibe = "modern" | "classical" | "premium";

/**
 * Unsplash CDN URL builder. Stable as long as the photographer keeps
 * the photo live. Every consumer layers a CSS gradient overlay so
 * even if any single photo 404s, the section still looks intentional.
 */
function img(id: string, w: number = 1600, q: number = 85): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;
}

/** Smaller headshot helper (square crop). */
function head(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=400&h=400&q=85&auto=format&fit=crop&crop=faces`;
}

export interface FacultyMember {
  name: string;
  role: string;
  credentials: string;
  photo: string;
}

export interface SampleTestimonial {
  name: string;
  role: string;
  stars: number;
  quote: string;
  avatar: string;
}

export interface WhyUsReason {
  icon: "graduation" | "shield" | "brain" | "users" | "book" | "message" | "globe" | "heart";
  title: string;
  body: string;
}

export interface GalleryTile {
  src: string;
  label: string;
}

export interface NewsItem {
  tag: string;
  title: string;
  date: string;
  body: string;
  img: string;
}

export interface SampleSchool {
  slug: string;
  name: string;
  shortName: string;
  monogram: string;
  tagline: string;
  established: string;
  city: string;
  state: string;
  pitch: string;
  cardBlurb: string;
  vibe: SampleVibe;
  heroStyle: SampleHeroStyle;
  /** Exam acronyms used in the dark stats band */
  examPrep: string[];

  imagery: {
    hero: string;
    about: string;
    admissions: string;
    contact: string;
    aboutHistory: string;
    aboutValues: string;
    programs: { jss: string; sss: string; examPrep: string; admissions: string };
    lifeGallery: GalleryTile[];
  };

  faculty: FacultyMember[];
  testimonials: SampleTestimonial[];
  whyUs: WhyUsReason[];
  news: NewsItem[];

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
  theme: {
    primary: string;
    accent: string;
    bg: string;
    text: string;
    surface: string;
    onPrimary: string;
    headingClass: string;
    bodyClass: string;
  };
}

export const SAMPLE_SCHOOLS: SampleSchool[] = [
  // ============================================================
  // 1. Falcon Academy — modern, tech-forward, ambitious
  // ============================================================
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
    examPrep: ["WAEC", "NECO", "JAMB", "IGCSE", "SAT", "TOEFL"],

    imagery: {
      hero: img("1607013251379-e6eecfffe234", 2000),
      about: img("1581090700227-1e37b190418e", 1600),
      admissions: img("1523240795612-9a054b0db644", 1800),
      contact: img("1571019613454-1cb2f99b2d8b", 1600),
      aboutHistory: img("1571260899304-425eee4c7efc", 900),
      aboutValues: img("1517245386807-bb43f82c33c4", 900),
      programs: {
        jss: img("1532094349884-543bc11b234d", 900),
        sss: img("1517245386807-bb43f82c33c4", 900),
        examPrep: img("1517486808906-6ca8b3f04846", 900),
        admissions: img("1523580494863-6f3031224c94", 900),
      },
      lifeGallery: [
        { src: img("1532094349884-543bc11b234d", 900), label: "Chemistry lab" },
        { src: img("1517245386807-bb43f82c33c4", 900), label: "Robotics club" },
        { src: img("1571260899304-425eee4c7efc", 900), label: "Main campus" },
        { src: img("1581090700227-1e37b190418e", 900), label: "Science research" },
        { src: img("1521587760476-6c12a4b040da", 900), label: "Inter-house basketball" },
        { src: img("1606761568499-6d2451b23c66", 900), label: "Senior physics" },
      ],
    },

    faculty: [
      { name: "Dr. Adekunle Bello", role: "Head of Academics", credentials: "PhD Education, University of Ibadan · 18 years teaching", photo: head("1507003211169-0a1dd7228f2d") },
      { name: "Ms. Chiamaka Okeke", role: "Head of Sciences", credentials: "MSc Molecular Biology, Imperial College London", photo: head("1494790108377-be9c29b29330") },
      { name: "Mr. Tunde Fashina", role: "Director of Technology", credentials: "BEng Computer Engineering, OAU · Google Certified Educator", photo: head("1582750433449-648ed127bb54") },
      { name: "Mrs. Ada Nwosu", role: "Head of Pastoral Care", credentials: "MA Counselling, University of Lagos · 12 years in safeguarding", photo: head("1573496359142-b8d87734a5a2") },
    ],

    testimonials: [
      { name: "Mrs. Adaeze Okafor", role: "Parent of SS 2 student", stars: 5, quote: "My son arrived shy and uncertain. Two years on, he leads the robotics club. Falcon doesn't just teach — they pull confidence out of children.", avatar: head("1580489944761-15a19d654956") },
      { name: "Daniel Adetola", role: "SS 3 prefect", stars: 5, quote: "The teachers here treat us like we're already adults. I'm not just preparing for WAEC — I'm preparing for the work I'll do for the next forty years.", avatar: head("1610484826917-0f93dadf02ba") },
      { name: "Tomiwa Lawal", role: "Class of 2022, now at MIT", stars: 5, quote: "Falcon taught me to ask the second question. Every interview I've sat — Google, MIT, Y Combinator — has come down to that habit.", avatar: head("1559548331-f9cb98001426") },
    ],

    whyUs: [
      { icon: "graduation", title: "84% WAEC distinction rate", body: "Three years running. Our SS 3 cohort consistently outperforms the Lagos state average by a wide margin." },
      { icon: "brain", title: "Project-based learning", body: "Every student ships a real project every week — a circuit, an essay, a presentation. Portfolios travel with them." },
      { icon: "users", title: "12:1 student-to-teacher", body: "Small enough that your child is known by name on day one, by every member of staff." },
      { icon: "shield", title: "Safe, modern campus", body: "Gated facility, 24/7 security, fully air-conditioned classrooms, modern labs, and a 5,000-volume library." },
      { icon: "book", title: "Optional Cambridge stream", body: "Students applying internationally can take IGCSE / A-Level papers alongside the Nigerian curriculum." },
      { icon: "message", title: "Real-time parent portal", body: "Attendance, results, fees, and direct messaging with teachers — all on your phone, all up to date." },
    ],

    news: [
      { tag: "Achievement", title: "Robotics team silver at Lagos State Open", date: "Feb 24, 2026", body: "Our SS 2 team built a line-following robot in 48 hours, finishing second across 41 entries.", img: img("1517245386807-bb43f82c33c4", 800) },
      { tag: "Event", title: "Term 2 parent-teacher conferences", date: "Feb 11, 2026", body: "Sign-up window opens Monday. 20-minute slots, in person or on Zoom.", img: img("1573497019418-b400bb3ab074", 800) },
      { tag: "Achievement", title: "Three through to Coding Olympiad nationals", date: "Jan 29, 2026", body: "Daniel (SS 1), Adaeze (JSS 3), and Tobi (SS 2) advanced from the Lagos qualifier.", img: img("1517245386807-bb43f82c33c4", 800) },
    ],

    contact: {
      addressLines: ["12 Admiralty Way", "Lekki Phase 1, Lagos"],
      phone: "0809 555 0101",
      email: "admissions@falconacademy.ng",
      hours: "Mon – Fri · 7:30am – 4:30pm",
    },
    programs: [
      { title: "Junior Secondary (JSS 1–3)", body: "A six-subject core (Maths, English, Sciences, Coding, Civics, French) anchored by weekly research labs." },
      { title: "Senior Secondary (SS 1–3)", body: "Pick a track — Pure Sciences, Tech & Engineering, or Commercial — taught by subject specialists." },
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
  },

  // ============================================================
  // 2. Sunrise Preparatory School — traditional, warm, classical
  // ============================================================
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
    examPrep: ["WAEC", "NECO", "JAMB", "Common Entrance", "Cambridge Checkpoint"],

    imagery: {
      hero: img("1592280771190-3e2e4d571952", 2000),
      about: img("1497486751825-1233686d5d80", 1600),
      admissions: img("1523580494863-6f3031224c94", 1800),
      contact: img("1532619675605-1ede6c2ed2b0", 1600),
      aboutHistory: img("1481627834876-b7833e8f5570", 900),
      aboutValues: img("1571019613454-1cb2f99b2d8b", 900),
      programs: {
        jss: img("1542621334-a254cf47733d", 900),
        sss: img("1517486808906-6ca8b3f04846", 900),
        examPrep: img("1503676260728-1c00da094a0b", 900),
        admissions: img("1571019613454-1cb2f99b2d8b", 900),
      },
      lifeGallery: [
        { src: img("1481627834876-b7833e8f5570", 900), label: "Senior library" },
        { src: img("1546519638-68e109498ffc", 900), label: "Inter-house football" },
        { src: img("1532619675605-1ede6c2ed2b0", 900), label: "Founder's Day" },
        { src: img("1497486751825-1233686d5d80", 900), label: "Matriculation 2025" },
        { src: img("1571019613454-1cb2f99b2d8b", 900), label: "Junior choir" },
        { src: img("1523580494863-6f3031224c94", 900), label: "Common Entrance day" },
      ],
    },

    faculty: [
      { name: "Mrs. Folake Adeyemi", role: "Headmistress", credentials: "MA Education, University of London · 27 years at Sunrise", photo: head("1573496359142-b8d87734a5a2") },
      { name: "Rev. Dr. Samuel Okolie", role: "Director of Pastoral Care", credentials: "Doctor of Ministry, University of Edinburgh · Anglican Chaplain", photo: head("1438761681033-6461ffad8d80") },
      { name: "Mr. Yinka Bamidele", role: "Head of Senior School", credentials: "MA Classics, University of Ibadan · Old Boy, Class of 1998", photo: head("1559548331-f9cb98001426") },
      { name: "Mrs. Bisi Olaniyan", role: "Head of Boarding", credentials: "MEd Pastoral Studies · Resident Matron, Stuart House", photo: head("1580489944761-15a19d654956") },
    ],

    testimonials: [
      { name: "Mr. & Mrs. Adeniyi", role: "Parents of two Sunrise alumni", stars: 5, quote: "Both of our children speak of Sunrise the way we speak of our own school days — as the place that shaped them. We could not have hoped for more.", avatar: head("1580489944761-15a19d654956") },
      { name: "Funmi Ogundipe", role: "SS 3, House Prefect", stars: 5, quote: "I came in shy. Six years on, I've stood at the podium of Founder's Day, sung in the choir at Lagos Cathedral, and learned to disagree well. That's what this place does.", avatar: head("1531427186611-f7a8a7e9bb45") },
      { name: "Dr. Ifeanyi Eze", role: "Class of 2007, Consultant Cardiologist", stars: 5, quote: "What Sunrise taught me about character has served me more in medicine than what it taught me about chemistry. The grades came; the values stayed.", avatar: head("1521252659862-eec69941b071") },
    ],

    whyUs: [
      { icon: "heart", title: "33 years of formation", body: "Three decades of forming young women and men. Our alumni now lead in finance, medicine, government, and ministry across West Africa." },
      { icon: "graduation", title: "Conduct is graded", body: "We grade conduct alongside scholarship. A first-class mind without character is half an education — and we say so on every report card." },
      { icon: "users", title: "House system", body: "Stuart, Lawrence, Crowther, Akintola. Houses with prefects who mentor, compete, and look out for one another." },
      { icon: "shield", title: "Single-sex boarding", body: "Resident matrons, evening prep, weekend recreation, and Sunday chapel form the rhythm of senior life." },
      { icon: "book", title: "Classical scholarship", body: "Read widely. Write often. Argue your case. We teach Latin from JSS 2 and require senior debate from every prefect." },
      { icon: "globe", title: "Service as habit", body: "Every senior student commits to a community project. It is not optional — it is part of who we are." },
    ],

    news: [
      { tag: "Event", title: "Founder's Day — 33 years of Sunrise", date: "Feb 22, 2026", body: "The Headmistress reflected on three decades of formation and the alumni who now lead across West Africa.", img: img("1497486751825-1233686d5d80", 800) },
      { tag: "Achievement", title: "Stuart House triumph in debate finals", date: "Feb 04, 2026", body: "A spirited contest on the motion: 'Tradition serves the future more faithfully than innovation does.'", img: img("1571019613454-1cb2f99b2d8b", 800) },
      { tag: "Notice", title: "Chapel choir tours Lagos", date: "Jan 20, 2026", body: "Three concerts in aid of the bursary programme. Tickets available through the bursar's office.", img: img("1532619675605-1ede6c2ed2b0", 800) },
    ],

    contact: {
      addressLines: ["Plot 7, Ring Road Layout", "Ibadan, Oyo State"],
      phone: "0803 444 0202",
      email: "admissions@sunriseprep.ng",
      hours: "Mon – Fri · 8:00am – 4:00pm",
    },
    programs: [
      { title: "Junior School (JSS 1–3)", body: "Broad foundation in the humanities and sciences, with daily reading, weekly chapel, and house-based pastoral care." },
      { title: "Senior School (SS 1–3)", body: "Choose Sciences, Commercial, or Arts. Small class sizes, traditional examinations, university preparation from SS 1." },
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
  },

  // ============================================================
  // 3. Northgate International — premium, minimalist, Cambridge
  // ============================================================
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
    examPrep: ["IGCSE", "A-Level", "Checkpoint", "WAEC", "SAT", "UCAS"],

    imagery: {
      hero: img("1485827404703-89b55fcc595e", 2000),
      about: img("1523050854058-8df90110c9f1", 1600),
      admissions: img("1606761568499-6d2451b23c66", 1800),
      contact: img("1554995207-c18c203602cb", 1600),
      aboutHistory: img("1554995207-c18c203602cb", 900),
      aboutValues: img("1606761568499-6d2451b23c66", 900),
      programs: {
        jss: img("1542621334-a254cf47733d", 900),
        sss: img("1581090700227-1e37b190418e", 900),
        examPrep: img("1517486808906-6ca8b3f04846", 900),
        admissions: img("1523050854058-8df90110c9f1", 900),
      },
      lifeGallery: [
        { src: img("1554995207-c18c203602cb", 900), label: "North Wing" },
        { src: img("1606761568499-6d2451b23c66", 900), label: "Year 12 Chemistry" },
        { src: img("1523240795612-9a054b0db644", 900), label: "A-Level Results Day" },
        { src: img("1485827404703-89b55fcc595e", 900), label: "Sixth Form Centre" },
        { src: img("1517486808906-6ca8b3f04846", 900), label: "IGCSE prep" },
        { src: img("1523050854058-8df90110c9f1", 900), label: "Campus walk" },
      ],
    },

    faculty: [
      { name: "Mr. Chukwuma Eze", role: "Principal", credentials: "MA Education, Cambridge · Former Head, Lagos Cambridge School", photo: head("1560250097-0b93528c311a") },
      { name: "Dr. Kemi Akande", role: "Head of Sciences", credentials: "DPhil Molecular Biology, Oxford · 14 published papers", photo: head("1580489944761-15a19d654956") },
      { name: "Mr. James Okonjo", role: "Director of UCAS Counselling", credentials: "MA, University of Cambridge · Former UCAS officer, Eton", photo: head("1438761681033-6461ffad8d80") },
      { name: "Mrs. Aisha Mohammed", role: "Head of Sixth Form", credentials: "PhD Mathematics, Imperial College London", photo: head("1494790108377-be9c29b29330") },
    ],

    testimonials: [
      { name: "Mrs. Funke Adeleke", role: "Mother of Year 13 student", stars: 5, quote: "We considered sending our daughter abroad for sixth form. Northgate gave us a reason to stay — eight UCAS offers, including Oxford, without ever leaving Abuja.", avatar: head("1494790108377-be9c29b29330") },
      { name: "Adaeze Eze", role: "Year 12 Head Girl", stars: 5, quote: "I'm not just preparing for A-Levels. I'm being prepared to walk into a Cambridge interview, hold my own, and represent the country I love.", avatar: head("1531427186611-f7a8a7e9bb45") },
      { name: "Tomi Adesanya", role: "Class of 2023, now at LSE", stars: 5, quote: "Northgate's A-Level Economics teaching is, frankly, better than what I have seen friends receive at British boarding schools. It is that good.", avatar: head("1582750433449-648ed127bb54") },
    ],

    whyUs: [
      { icon: "graduation", title: "62% A* / A at A-Level", body: "Three-year rolling average. Our Year 13 cohort regularly outperforms the global Cambridge average." },
      { icon: "globe", title: "Globally portable", body: "Graduates matriculate at Oxford, Cambridge, LSE, McGill, UCT, NYU, and the top US liberal-arts colleges." },
      { icon: "users", title: "Small classes, world-class faculty", body: "Average class size 14. 78% of teaching faculty hold a Master's or doctorate." },
      { icon: "book", title: "Full Cambridge pathway", body: "Primary, Lower Secondary, IGCSE, and A-Level — one curriculum, end-to-end, with optional WAEC bridge for Nigerian university entry." },
      { icon: "shield", title: "Pastoral excellence", body: "Vertical tutor groups, dedicated UCAS counsellors, and a sixth-form mentorship programme from Year 12." },
      { icon: "heart", title: "Nigerian at heart", body: "Cambridge curriculum, Nigerian context. We teach Yoruba, Igbo, Hausa, and Civics alongside the international syllabus." },
    ],

    news: [
      { tag: "Achievement", title: "Year 13 receives early UCAS offers", date: "Feb 26, 2026", body: "Eight conditional offers from Russell Group institutions, including two from Oxford and Cambridge.", img: img("1523240795612-9a054b0db644", 800) },
      { tag: "Event", title: "Northgate hosts FCT Maths Challenge", date: "Feb 15, 2026", body: "180 students from 22 schools competed across three age categories. Our Year 10 team placed third overall.", img: img("1606761568499-6d2451b23c66", 800) },
      { tag: "Notice", title: "Faculty welcomes Dr. Akande", date: "Feb 02, 2026", body: "New Head of Sciences joins from a senior research role at a leading Lagos university, with a doctorate in molecular biology.", img: img("1581090700227-1e37b190418e", 800) },
    ],

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
  },
];

export function getSampleSchool(slug: string): SampleSchool | undefined {
  return SAMPLE_SCHOOLS.find(s => s.slug === slug);
}

/**
 * Quick hex-to-rgba helper for inline gradient overlays on top of
 * background images. Assumes #RRGGBB.
 */
export function hexAlpha(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Shared photography used outside the per-school definitions —
 * showcase index hero, /for-schools landing imagery, etc.
 */
export const SHARED_IMAGERY = {
  showcaseHero: img("1523240795612-9a054b0db644", 2000),
  forSchoolsHero: img("1503676260728-1c00da094a0b", 2000),
  portalDevice: img("1551836022-d5d88e9218df", 1400),
  campusLife: img("1571019613454-1cb2f99b2d8b", 1400),
  classroom: img("1580582932707-520aed937b7b", 1400),
  parentMeeting: img("1573497019418-b400bb3ab074", 1400),
} as const;
