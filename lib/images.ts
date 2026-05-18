/**
 * Cloudinary image map for meclonescollege.com
 *
 * Each URL applies `f_auto,q_auto` so Cloudinary serves the best format
 * (AVIF/WebP) and an optimal quality per device — combined with Next.js
 * Image responsive `sizes`, this gives small payloads without losing fidelity.
 *
 * To add a new image: upload to Cloudinary, copy its public URL, then add an
 * entry here with the placement that uses it. Keep the keys descriptive.
 */
const CLOUD = "https://res.cloudinary.com/dmuczlarv/image/upload";
const F = "f_auto,q_auto";

const u = (versionAndId: string) => `${CLOUD}/${F}/${versionAndId}`;

// Raw uploaded assets (named by what's IN the image, not where they're used).
export const IMG = {
  /** Two students in uniform smiling in front of school — flagship hero shot. */
  HERO_TWO_STUDENTS: u("v1779141057/ChatGPT_Image_May_18_2026_10_36_35_PM_1_oqrds2.png"),
  /** Boy + girl studying at classroom desk, smiling. */
  CLASSROOM_STUDY: u("v1779141656/ChatGPT_Image_May_18_2026_10_36_35_PM_2_r7l4qy.png"),
  /** Duplicate of CLASSROOM_STUDY (kept for completeness). */
  CLASSROOM_STUDY_ALT: u("v1779141663/ChatGPT_Image_May_18_2026_10_36_35_PM_2_bbhahh.png"),
  /** Boy at microscope, girl writing — science lab scene. */
  SCIENCE_LAB: u("v1779141671/ChatGPT_Image_May_18_2026_10_36_35_PM_3_lnk5fd.png"),
  /** Female student studying alone with subject textbooks — exam prep vibe. */
  EXAM_STUDY_GIRL: u("v1779141697/ChatGPT_Image_May_18_2026_10_36_35_PM_4_bqilpu.png"),
  /** Four students playing basketball outdoors. */
  BASKETBALL: u("v1779141705/ChatGPT_Image_May_18_2026_10_36_35_PM_6_q3dzdv.png"),
  /** Three students reading books in library. */
  LIBRARY_TRIO: u("v1779141706/ChatGPT_Image_May_18_2026_10_36_35_PM_7_ertqbd.png"),
  /** Four students at a study table together, smiling. */
  STUDY_GROUP: u("v1779141717/ChatGPT_Image_May_18_2026_10_36_35_PM_5_fwwcg6.png"),
  /** Male student headshot. */
  HEADSHOT_MALE: u("v1779141727/ChatGPT_Image_May_18_2026_10_36_36_PM_9_qtf9x5.png"),
  /** Group of 5 students in uniform, school building behind. */
  GROUP_PORTRAIT: u("v1779141728/ChatGPT_Image_May_18_2026_10_36_35_PM_8_fqcs7f.png"),
  /** Female student headshot. */
  HEADSHOT_FEMALE: u("v1779141728/ChatGPT_Image_May_18_2026_10_36_37_PM_10_kaxejq.png"),
} as const;

// Per-placement aliases — pages import these by what they're showing, not by
// the raw asset. If you swap an image later, change it here only.
export const PLACE = {
  homeHero: IMG.HERO_TWO_STUDENTS,
  programs: {
    jss: IMG.CLASSROOM_STUDY,
    sss: IMG.SCIENCE_LAB,
    examPrep: IMG.EXAM_STUDY_GIRL,
    admissions: IMG.GROUP_PORTRAIT,
  },
  lifeAtMeclones: [
    { src: IMG.CLASSROOM_STUDY, label: "Classroom" },
    { src: IMG.GROUP_PORTRAIT, label: "Our students" },
    { src: IMG.BASKETBALL, label: "Sports day" },
    { src: IMG.SCIENCE_LAB, label: "Science lab" },
    { src: IMG.LIBRARY_TRIO, label: "Library" },
    { src: IMG.STUDY_GROUP, label: "Group study" },
  ],
  testimonialAvatars: {
    daniel: IMG.HEADSHOT_MALE,
    adebola: IMG.HEADSHOT_FEMALE,
  },
  aboutHero: IMG.GROUP_PORTRAIT,
  aboutHistory: IMG.LIBRARY_TRIO,
  aboutValues: IMG.STUDY_GROUP,
  admissionHero: IMG.GROUP_PORTRAIT,
  gallery: [
    { src: IMG.BASKETBALL, label: "Inter-house Sports 2025", category: "Sports" },
    { src: IMG.GROUP_PORTRAIT, label: "Cultural Day", category: "Events" },
    { src: IMG.SCIENCE_LAB, label: "Science Fair", category: "Academics" },
    { src: IMG.STUDY_GROUP, label: "Founder's Day Lecture", category: "Events" },
    { src: IMG.CLASSROOM_STUDY, label: "STEM Class", category: "Facilities" },
    { src: IMG.LIBRARY_TRIO, label: "Debate Finals", category: "Co-curricular" },
    { src: IMG.HERO_TWO_STUDENTS, label: "Graduation 2025", category: "Events" },
    { src: IMG.LIBRARY_TRIO, label: "Library Reading Hour", category: "Facilities" },
    { src: IMG.EXAM_STUDY_GIRL, label: "WAEC Mock Awards", category: "Academics" },
  ],
  news: {
    interhouse: IMG.BASKETBALL,
    mockWAEC: IMG.EXAM_STUDY_GIRL,
    ptaMeeting: IMG.STUDY_GROUP,
    careerDay: IMG.STUDY_GROUP,
    cambridgeAwards: IMG.SCIENCE_LAB,
    calendar: IMG.GROUP_PORTRAIT,
  },
} as const;
