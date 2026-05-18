// Central mock database for the Meclones prototype.
// All dashboards read from this. Persisted to localStorage via lib/store.ts.

export type Role = "director" | "school_admin" | "teacher" | "parent" | "student" | "accountant";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // demo only
  role: Role;
  avatar?: string;
  phone?: string;
  linkedId?: string; // links parent->student, teacher->teacher record etc.
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  parentId: string;
  gender: "M" | "F";
  admissionNo: string;
  dob: string;
  photo?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classes: string[];
  phone: string;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  studentIds: string[];
}

export interface SchoolClass {
  id: string;
  name: string;
  level: "JSS" | "SSS";
  teacherId: string;
  capacity: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  level: "JSS" | "SSS" | "ALL";
}

export interface Invoice {
  id: string;
  studentId: string;
  term: string;
  amount: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
  dueDate: string;
  items: { label: string; amount: number }[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: "paystack" | "transfer" | "cash";
  reference: string;
  date: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: "present" | "absent" | "late";
  markedBy: string;
}

export interface Result {
  id: string;
  studentId: string;
  term: string;
  subjects: {
    subjectId: string;
    ca: number; // continuous assessment /40
    exam: number; // /60
    total: number;
    grade: string;
    comment: string;
  }[];
  teacherComment: string;
  principalComment: string;
  status: "draft" | "pending_admin" | "pending_principal" | "published";
  position?: number;
}

export interface Application {
  id: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  classApplying: string;
  previousSchool: string;
  status: "submitted" | "review" | "exam_scheduled" | "admitted" | "rejected";
  submittedAt: string;
  examDate?: string;
}

export interface WhatsAppLog {
  id: string;
  to: string;
  recipientName: string;
  trigger: string;
  message: string;
  status: "sent" | "delivered" | "read";
  timestamp: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: "all" | "parents" | "students" | "staff";
  date: string;
}

export interface Assignment {
  id: string;
  title: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dueDate: string;
  description: string;
  submissions: { studentId: string; submittedAt: string; score?: number }[];
}

export interface Complaint {
  id: string;
  from: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
  date: string;
}

// ---------- Seed data ----------

export const SUBJECTS: Subject[] = [
  { id: "subj-math", name: "Mathematics", code: "MTH", level: "ALL" },
  { id: "subj-eng", name: "English Language", code: "ENG", level: "ALL" },
  { id: "subj-bio", name: "Biology", code: "BIO", level: "SSS" },
  { id: "subj-phy", name: "Physics", code: "PHY", level: "SSS" },
  { id: "subj-bst", name: "Basic Science & Tech", code: "BST", level: "JSS" },
  { id: "subj-civ", name: "Civic Education", code: "CIV", level: "ALL" },
];

export const CLASSES: SchoolClass[] = [
  { id: "cls-jss1a", name: "JSS 1A", level: "JSS", teacherId: "tch-1", capacity: 30 },
  { id: "cls-jss2a", name: "JSS 2A", level: "JSS", teacherId: "tch-2", capacity: 30 },
  { id: "cls-ss1a", name: "SS 1A", level: "SSS", teacherId: "tch-3", capacity: 28 },
  { id: "cls-ss3a", name: "SS 3A (WAEC)", level: "SSS", teacherId: "tch-4", capacity: 25 },
];

export const TEACHERS: Teacher[] = [
  { id: "tch-1", name: "Mrs. Adaeze Obi", email: "adaeze.obi@meclones.edu.ng", subjects: ["subj-eng", "subj-civ"], classes: ["cls-jss1a"], phone: "+2348031110001" },
  { id: "tch-2", name: "Mr. Tunde Bakare", email: "tunde.bakare@meclones.edu.ng", subjects: ["subj-math"], classes: ["cls-jss2a", "cls-ss1a"], phone: "+2348031110002" },
  { id: "tch-3", name: "Dr. Chioma Eze", email: "chioma.eze@meclones.edu.ng", subjects: ["subj-bio"], classes: ["cls-ss1a", "cls-ss3a"], phone: "+2348031110003" },
  { id: "tch-4", name: "Mr. Femi Adekunle", email: "femi.adekunle@meclones.edu.ng", subjects: ["subj-phy", "subj-math"], classes: ["cls-ss3a"], phone: "+2348031110004" },
  { id: "tch-5", name: "Mrs. Ngozi Umeh", email: "ngozi.umeh@meclones.edu.ng", subjects: ["subj-bst"], classes: ["cls-jss1a", "cls-jss2a"], phone: "+2348031110005" },
];

export const PARENTS: Parent[] = [
  { id: "par-1", name: "Mr. & Mrs. Okafor", email: "okafor.family@gmail.com", phone: "+2348061110001", occupation: "Engineer / Doctor", studentIds: ["std-1"] },
  { id: "par-2", name: "Dr. Aisha Bello", email: "aisha.bello@gmail.com", phone: "+2348061110002", occupation: "Medical Doctor", studentIds: ["std-2", "std-7"] },
  { id: "par-3", name: "Mr. Olumide Johnson", email: "olumide.j@gmail.com", phone: "+2348061110003", occupation: "Banker", studentIds: ["std-3"] },
  { id: "par-4", name: "Mrs. Funmi Adesina", email: "funmi.adesina@gmail.com", phone: "+2348061110004", occupation: "Entrepreneur", studentIds: ["std-4", "std-8"] },
  { id: "par-5", name: "Mr. Ibrahim Musa", email: "ibrahim.musa@gmail.com", phone: "+2348061110005", occupation: "Lawyer", studentIds: ["std-5", "std-9", "std-10"] },
];

export const STUDENTS: Student[] = [
  { id: "std-1", name: "Chidera Okafor", classId: "cls-jss1a", parentId: "par-1", gender: "F", admissionNo: "MC/2025/001", dob: "2013-04-12" },
  { id: "std-2", name: "Zainab Bello", classId: "cls-jss1a", parentId: "par-2", gender: "F", admissionNo: "MC/2025/002", dob: "2013-08-03" },
  { id: "std-3", name: "Tomiwa Johnson", classId: "cls-jss2a", parentId: "par-3", gender: "M", admissionNo: "MC/2024/015", dob: "2012-02-21" },
  { id: "std-4", name: "Damilola Adesina", classId: "cls-jss2a", parentId: "par-4", gender: "M", admissionNo: "MC/2024/016", dob: "2012-06-09" },
  { id: "std-5", name: "Fatima Musa", classId: "cls-ss1a", parentId: "par-5", gender: "F", admissionNo: "MC/2023/044", dob: "2010-11-15" },
  { id: "std-6", name: "Emmanuel Eze", classId: "cls-ss1a", parentId: "par-3", gender: "M", admissionNo: "MC/2023/045", dob: "2010-09-30" },
  { id: "std-7", name: "Yusuf Bello", classId: "cls-ss3a", parentId: "par-2", gender: "M", admissionNo: "MC/2021/008", dob: "2008-03-17" },
  { id: "std-8", name: "Tolulope Adesina", classId: "cls-ss3a", parentId: "par-4", gender: "F", admissionNo: "MC/2021/009", dob: "2008-07-22" },
  { id: "std-9", name: "Hauwa Musa", classId: "cls-jss2a", parentId: "par-5", gender: "F", admissionNo: "MC/2024/017", dob: "2012-12-01" },
  { id: "std-10", name: "Abdullahi Musa", classId: "cls-ss1a", parentId: "par-5", gender: "M", admissionNo: "MC/2023/046", dob: "2010-05-19" },
];

export const USERS: User[] = [
  { id: "u-director", name: "Mrs. Olufunke Adebayo", email: "director@meclones.edu.ng", password: "demo1234", role: "director", phone: "+2348030000001" },
  { id: "u-admin", name: "Mr. Kelechi Nnamdi", email: "admin@meclones.edu.ng", password: "demo1234", role: "school_admin", phone: "+2348030000002" },
  { id: "u-teacher", name: "Mrs. Adaeze Obi", email: "teacher@meclones.edu.ng", password: "demo1234", role: "teacher", phone: "+2348031110001", linkedId: "tch-1" },
  { id: "u-parent", name: "Dr. Aisha Bello", email: "parent@meclones.edu.ng", password: "demo1234", role: "parent", phone: "+2348061110002", linkedId: "par-2" },
  { id: "u-student", name: "Yusuf Bello", email: "student@meclones.edu.ng", password: "demo1234", role: "student", phone: "+2348071110001", linkedId: "std-7" },
  { id: "u-accountant", name: "Mr. Sola Akinwale", email: "accountant@meclones.edu.ng", password: "demo1234", role: "accountant", phone: "+2348030000003" },
];

export const INVOICES: Invoice[] = [
  {
    id: "inv-1", studentId: "std-1", term: "First Term 2026", amount: 450000, paid: 450000, status: "paid",
    dueDate: "2026-01-20",
    items: [
      { label: "Tuition Fee", amount: 350000 },
      { label: "Books & Materials", amount: 45000 },
      { label: "PTA Levy", amount: 15000 },
      { label: "Excursion", amount: 25000 },
      { label: "Uniform", amount: 15000 },
    ],
  },
  {
    id: "inv-2", studentId: "std-2", term: "First Term 2026", amount: 450000, paid: 250000, status: "partial",
    dueDate: "2026-01-20",
    items: [
      { label: "Tuition Fee", amount: 350000 },
      { label: "Books & Materials", amount: 45000 },
      { label: "PTA Levy", amount: 15000 },
      { label: "Excursion", amount: 25000 },
      { label: "Uniform", amount: 15000 },
    ],
  },
  {
    id: "inv-3", studentId: "std-7", term: "First Term 2026", amount: 520000, paid: 0, status: "unpaid",
    dueDate: "2026-01-20",
    items: [
      { label: "Tuition Fee (SS3)", amount: 420000 },
      { label: "WAEC Registration", amount: 55000 },
      { label: "Books & Materials", amount: 30000 },
      { label: "PTA Levy", amount: 15000 },
    ],
  },
  {
    id: "inv-4", studentId: "std-5", term: "First Term 2026", amount: 480000, paid: 480000, status: "paid",
    dueDate: "2026-01-20",
    items: [
      { label: "Tuition Fee (SS1)", amount: 380000 },
      { label: "Lab Fee", amount: 45000 },
      { label: "Books & Materials", amount: 40000 },
      { label: "PTA Levy", amount: 15000 },
    ],
  },
  {
    id: "inv-5", studentId: "std-3", term: "First Term 2026", amount: 450000, paid: 200000, status: "partial",
    dueDate: "2026-01-20",
    items: [
      { label: "Tuition Fee", amount: 350000 },
      { label: "Books & Materials", amount: 45000 },
      { label: "PTA Levy", amount: 15000 },
      { label: "Excursion", amount: 25000 },
      { label: "Uniform", amount: 15000 },
    ],
  },
];

export const PAYMENTS: Payment[] = [
  { id: "pay-1", invoiceId: "inv-1", amount: 450000, method: "paystack", reference: "PSK_REF_2026_0001", date: "2026-01-08" },
  { id: "pay-2", invoiceId: "inv-2", amount: 250000, method: "transfer", reference: "BANK_TRF_0042", date: "2026-01-10" },
  { id: "pay-3", invoiceId: "inv-4", amount: 480000, method: "paystack", reference: "PSK_REF_2026_0023", date: "2026-01-05" },
  { id: "pay-4", invoiceId: "inv-5", amount: 200000, method: "paystack", reference: "PSK_REF_2026_0031", date: "2026-01-12" },
];

export const ATTENDANCE: AttendanceRecord[] = [
  { id: "att-1", studentId: "std-7", classId: "cls-ss3a", date: "2026-05-15", status: "present", markedBy: "tch-4" },
  { id: "att-2", studentId: "std-8", classId: "cls-ss3a", date: "2026-05-15", status: "late", markedBy: "tch-4" },
  { id: "att-3", studentId: "std-7", classId: "cls-ss3a", date: "2026-05-14", status: "present", markedBy: "tch-4" },
  { id: "att-4", studentId: "std-7", classId: "cls-ss3a", date: "2026-05-13", status: "absent", markedBy: "tch-4" },
  { id: "att-5", studentId: "std-2", classId: "cls-jss1a", date: "2026-05-15", status: "present", markedBy: "tch-1" },
];

export const RESULTS: Result[] = [
  {
    id: "res-1", studentId: "std-7", term: "Second Term 2026", status: "published", position: 3,
    subjects: [
      { subjectId: "subj-math", ca: 32, exam: 48, total: 80, grade: "A", comment: "Excellent grasp of calculus." },
      { subjectId: "subj-eng", ca: 28, exam: 45, total: 73, grade: "B", comment: "Strong essays; refine grammar." },
      { subjectId: "subj-bio", ca: 35, exam: 52, total: 87, grade: "A", comment: "Outstanding lab work." },
      { subjectId: "subj-phy", ca: 30, exam: 50, total: 80, grade: "A", comment: "Very good mechanics." },
    ],
    teacherComment: "Yusuf is a focused and disciplined student. WAEC ready.",
    principalComment: "Maintain this momentum. Aim for first position next term.",
  },
  {
    id: "res-2", studentId: "std-2", term: "Second Term 2026", status: "published", position: 1,
    subjects: [
      { subjectId: "subj-math", ca: 38, exam: 56, total: 94, grade: "A", comment: "Top of class." },
      { subjectId: "subj-eng", ca: 35, exam: 54, total: 89, grade: "A", comment: "Excellent comprehension." },
      { subjectId: "subj-bst", ca: 33, exam: 50, total: 83, grade: "A", comment: "Curious and thorough." },
    ],
    teacherComment: "Zainab is brilliant and well-mannered. A model student.",
    principalComment: "Keep shining.",
  },
  {
    id: "res-3", studentId: "std-1", term: "Second Term 2026", status: "published", position: 5,
    subjects: [
      { subjectId: "subj-math", ca: 22, exam: 38, total: 60, grade: "C", comment: "Needs extra practice." },
      { subjectId: "subj-eng", ca: 30, exam: 48, total: 78, grade: "B", comment: "Good progress." },
      { subjectId: "subj-bst", ca: 25, exam: 42, total: 67, grade: "B", comment: "Improving steadily." },
    ],
    teacherComment: "Chidera is making steady progress. Recommend extra math practice.",
    principalComment: "Keep working hard.",
  },
  {
    id: "res-4", studentId: "std-5", term: "Second Term 2026", status: "published", position: 2,
    subjects: [
      { subjectId: "subj-math", ca: 34, exam: 52, total: 86, grade: "A", comment: "Strong problem-solver." },
      { subjectId: "subj-eng", ca: 30, exam: 47, total: 77, grade: "B", comment: "Articulate writer." },
      { subjectId: "subj-bio", ca: 32, exam: 48, total: 80, grade: "A", comment: "Excellent." },
    ],
    teacherComment: "Fatima is diligent and consistent.",
    principalComment: "Excellent term. Push for first position.",
  },
  {
    id: "res-5", studentId: "std-3", term: "Second Term 2026", status: "pending_principal", position: 8,
    subjects: [
      { subjectId: "subj-math", ca: 18, exam: 30, total: 48, grade: "D", comment: "Falling behind." },
      { subjectId: "subj-eng", ca: 22, exam: 35, total: 57, grade: "C", comment: "Average." },
      { subjectId: "subj-bst", ca: 20, exam: 33, total: 53, grade: "C", comment: "Needs more focus." },
    ],
    teacherComment: "Tomiwa needs to apply himself more. Distraction is a concern.",
    principalComment: "",
  },
];

export const APPLICATIONS: Application[] = [
  { id: "app-1", studentName: "Daniel Okonkwo", parentName: "Mr. Stephen Okonkwo", parentPhone: "+2348091112201", parentEmail: "stephen.okonkwo@gmail.com", classApplying: "JSS 1", previousSchool: "Bright Stars Academy", status: "exam_scheduled", submittedAt: "2026-05-10", examDate: "2026-05-25" },
  { id: "app-2", studentName: "Grace Adewale", parentName: "Mrs. Bola Adewale", parentPhone: "+2348091112202", parentEmail: "bola.adewale@gmail.com", classApplying: "JSS 2", previousSchool: "Sunbeam Primary", status: "submitted", submittedAt: "2026-05-13" },
  { id: "app-3", studentName: "Joshua Ibe", parentName: "Mr. Ifeanyi Ibe", parentPhone: "+2348091112203", parentEmail: "ifeanyi.ibe@gmail.com", classApplying: "SS 1", previousSchool: "Greenfield High", status: "admitted", submittedAt: "2026-04-22" },
  { id: "app-4", studentName: "Khadija Lawal", parentName: "Mrs. Hafsat Lawal", parentPhone: "+2348091112204", parentEmail: "hafsat.lawal@gmail.com", classApplying: "JSS 1", previousSchool: "Crescent Preparatory", status: "review", submittedAt: "2026-05-14" },
  { id: "app-5", studentName: "Michael Asante", parentName: "Mr. Kofi Asante", parentPhone: "+2348091112205", parentEmail: "kofi.asante@gmail.com", classApplying: "JSS 1", previousSchool: "Lekki Montessori", status: "submitted", submittedAt: "2026-05-15" },
];

export const WHATSAPP_LOGS: WhatsAppLog[] = [
  { id: "wa-1", to: "+2348091112201", recipientName: "Mr. Stephen Okonkwo", trigger: "Application Approved", message: "Dear Mr. Okonkwo, Daniel's application has been approved. Entrance exam scheduled for May 25, 2026 at 9:00am. Venue: Meclones College, Lekki.", status: "read", timestamp: "2026-05-12 09:14" },
  { id: "wa-2", to: "+2348061110002", recipientName: "Dr. Aisha Bello", trigger: "Fee Invoice Generated", message: "Dear Dr. Bello, the First Term 2026 invoice for Yusuf (SS3A) of ₦520,000 has been generated. Due: Jan 20, 2026. Pay via portal: meclones.edu.ng/portal", status: "delivered", timestamp: "2026-05-15 08:00" },
  { id: "wa-3", to: "+2348061110003", recipientName: "Mr. Olumide Johnson", trigger: "Attendance Alert", message: "Dear Mr. Johnson, Tomiwa was marked LATE today (May 15, 2026). Please ensure punctuality. — Meclones College", status: "read", timestamp: "2026-05-15 08:25" },
  { id: "wa-4", to: "+2348061110001", recipientName: "Mr. & Mrs. Okafor", trigger: "Result Published", message: "Dear Parent, Chidera's Second Term 2026 result has been published. Position: 5th. Login to view: meclones.edu.ng/portal", status: "read", timestamp: "2026-05-14 16:30" },
  { id: "wa-5", to: "+2348061110005", recipientName: "Mr. Ibrahim Musa", trigger: "Payment Confirmed", message: "Dear Mr. Musa, your payment of ₦480,000 for Fatima Musa (SS1A) has been received. Receipt #: PSK_REF_2026_0023. Thank you.", status: "delivered", timestamp: "2026-01-05 14:22" },
];

export const ANNOUNCEMENTS: Announcement[] = [
  { id: "ann-1", title: "Mid-term break", body: "School resumes Monday, June 1, 2026 after the mid-term break. Have a restful holiday.", audience: "all", date: "2026-05-15" },
  { id: "ann-2", title: "PTA Meeting", body: "Quarterly PTA meeting holds on Saturday, May 30, 2026 at 10:00am in the school hall.", audience: "parents", date: "2026-05-14" },
  { id: "ann-3", title: "WAEC Mock Results", body: "WAEC Mock results are now available on the portal. SS3 parents kindly review with your wards.", audience: "parents", date: "2026-05-10" },
  { id: "ann-4", title: "Inter-house Sports", body: "Inter-house sports competition begins Friday, May 22, 2026. All students must be in their house colours.", audience: "students", date: "2026-05-12" },
];

export const ASSIGNMENTS: Assignment[] = [
  { id: "asg-1", title: "Quadratic Equations — Problem Set 4", classId: "cls-ss3a", subjectId: "subj-math", teacherId: "tch-4", dueDate: "2026-05-20", description: "Solve problems 1–15 on page 87 of New General Mathematics. Show all working.", submissions: [{ studentId: "std-7", submittedAt: "2026-05-14" }, { studentId: "std-8", submittedAt: "2026-05-15" }] },
  { id: "asg-2", title: "Essay: My Vision for Nigeria", classId: "cls-jss1a", subjectId: "subj-eng", teacherId: "tch-1", dueDate: "2026-05-22", description: "Write a 400-word essay on your vision for Nigeria in 10 years.", submissions: [{ studentId: "std-2", submittedAt: "2026-05-15", score: 18 }] },
  { id: "asg-3", title: "Photosynthesis Lab Report", classId: "cls-ss1a", subjectId: "subj-bio", teacherId: "tch-3", dueDate: "2026-05-21", description: "Submit a 2-page lab report on the photosynthesis experiment conducted on May 13.", submissions: [] },
];

export const COMPLAINTS: Complaint[] = [
  { id: "cmp-1", from: "Mr. Olumide Johnson", subject: "Bus schedule delay", message: "The morning bus has been arriving 20 minutes late for the past week.", status: "in_progress", date: "2026-05-14" },
  { id: "cmp-2", from: "Mrs. Funmi Adesina", subject: "Lunch menu", message: "Please consider including more vegetarian options.", status: "open", date: "2026-05-15" },
  { id: "cmp-3", from: "Dr. Aisha Bello", subject: "Lost textbook", message: "Yusuf's Physics textbook went missing from the locker.", status: "resolved", date: "2026-05-10" },
];

// Helpers — all accept undefined so portal pages can pass User.linkedId directly.
export function studentById(id?: string) { return id ? STUDENTS.find(s => s.id === id) : undefined; }
export function classById(id?: string) { return id ? CLASSES.find(c => c.id === id) : undefined; }
export function parentById(id?: string) { return id ? PARENTS.find(p => p.id === id) : undefined; }
export function teacherById(id?: string) { return id ? TEACHERS.find(t => t.id === id) : undefined; }
export function subjectById(id?: string) { return id ? SUBJECTS.find(s => s.id === id) : undefined; }
export function invoiceByStudent(id?: string) { return id ? INVOICES.find(i => i.studentId === id) : undefined; }
export function resultByStudent(id?: string) { return id ? RESULTS.find(r => r.studentId === id) : undefined; }
export function studentsByClass(id?: string) { return id ? STUDENTS.filter(s => s.classId === id) : []; }
export function studentsByParent(id?: string) { return id ? STUDENTS.filter(s => s.parentId === id) : []; }

export function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}
