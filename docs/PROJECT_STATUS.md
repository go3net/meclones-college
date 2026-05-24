# Meclones College Lekki — Project Status

> **Read this first** when picking up the project in a fresh Claude session.
> Updated through commit `d6984b4` (2026-05-24).

---

## 1 · Project snapshot

- **Repo**: https://github.com/go3net/meclones-college
- **Live URL**: https://meclones-college-production.up.railway.app
- **Hosting**: Railway (`affectionate-integrity` project, `production` env)
- **Owner**: Mose (`moseg86@gmail.com`)
- **Local path**: `~/Downloads/meclones-college`
- **Default branch**: `main` — every push triggers a Railway redeploy
- **DB**: PostgreSQL plugin in the same Railway project, internal URL via `${{Postgres.DATABASE_URL}}`
- **Schema sync**: `prisma db push` runs in the start command on every boot — no migration files yet

---

## 2 · Stack

| Layer       | Tool                                          |
| ----------- | --------------------------------------------- |
| Framework   | Next.js 14.2.35 (App Router) + TypeScript     |
| Styling     | Tailwind + custom design system in `components/ui.tsx` |
| DB          | PostgreSQL via Prisma 5.22 ORM                |
| Auth        | NextAuth v5 (JWT sessions, **no Prisma adapter** — see §4) |
| Media       | Cloudinary (server proxy upload at `/api/upload`) |
| Payments    | Paystack (REST, no SDK)                       |
| Email       | Resend                                        |
| WhatsApp    | Both: in-Next.js Meta Cloud API bot AT `/api/whatsapp/meta` + n8n REST endpoints |
| Hosting     | Railway                                       |

---

## 3 · Repo layout

```
app/
├── (public)/                Marketing site — home, about, academics,
│                            admission, apply, contact, gallery, news, etc.
├── portal/                  All authenticated portal routes:
│   ├── login                 NextAuth credentials login (email OR admission#)
│   ├── forgot                Password reset request
│   ├── reset-password/[token]  Reset with token
│   ├── me                    Forwarder → role's home dashboard
│   ├── me/profile            Edit own profile (every role)
│   ├── director/*            Super-admin/Director-only pages
│   ├── admin/*               School admin pages (CRUD for students,
│   │                         teachers, parents, classes, subjects, fees,
│   │                         applications, attendance, library, awards,
│   │                         complaints, announcements, staff, results)
│   ├── teacher/*             Teacher dashboard, classes, students/[id],
│   │                         attendance + score entry
│   ├── student/*             Student dashboard, results, attendance, fees, library
│   ├── parent/*              Parent dashboard, results, attendance, fees,
│   │                         complaints, library, WhatsApp opt-in
│   ├── accountant/           Accountant home (fees-focused)
│   ├── whatsapp/             Inbox view of WhatsApp logs
│   └── results/[studentId]/slip  Print-friendly A4 result slip
└── api/
    ├── auth/[...nextauth]    NextAuth handlers
    ├── admissions/           Public site form (POST)
    ├── contact/              Public site form (POST)
    ├── upload/               Cloudinary photo upload
    ├── paystack/{init,callback,webhook}
    ├── notifications/{,/mark-read}
    ├── health/               Liveness + DB ping (Railway healthcheck)
    └── whatsapp/{verify-admission,results,attendance,fees,announcements,
                  escalate,log}  REST endpoints for n8n

components/                  Shared UI
├── ui.tsx                    Button, Card, Input, Badge, StatCard, etc.
├── PortalShell.tsx           Sidebar nav + header (role-aware)
├── PublicHeader.tsx / PublicFooter.tsx
├── Logo.tsx
├── PhotoUpload.tsx           File picker → /api/upload → Cloudinary
├── PayNowButton.tsx          Parent/student Paystack flow
├── NotificationsBell.tsx     Real-time bell with unread count + dropdown
├── LibraryBrowser.tsx        Shared book browser for student + parent
└── PrintButton.tsx           Browser-print helper for slip + receipt

lib/
├── constants.ts              SCHOOL info, STATS, EXAMS, PROGRAMS
├── images.ts                 Cloudinary URLs for the public site
├── prisma.ts                 Singleton PrismaClient
├── auth-helpers.ts           getSessionUser / requireRole / getCurrentX
├── notify.ts                 Bulk-notify helper
├── audit.ts                  auditLog() fire-and-forget logger
├── paystack.ts               REST helpers (init + verify)
├── apply-payment.ts          Idempotent payment apply (used by callback + webhook)
├── cloudinary.ts             SDK config + upload helpers
├── resend.ts                 All transactional email templates
├── password-reset.ts         Token gen + consume (SHA-256 hashed)
├── auth.ts (top-level)       NextAuth main config (Node runtime)
└── auth.config.ts (top-level)  Edge-safe NextAuth config — used by middleware

prisma/
├── schema.prisma             All models — see §5
└── seed.ts                   Demo data seeder (run via `npm run db:seed`)

middleware.ts                 Edge middleware enforcing role-based ACL
railway.json                  Build/start commands + healthcheck path
```

---

## 4 · Auth model (important)

- **JWT sessions, not database sessions**. The Prisma adapter is intentionally NOT attached — speeds up login and avoids per-request adapter lookups.
- Credentials provider in `auth.ts` accepts **either email OR admission number** as the identifier (`looksLikeEmail()` switches on `@`).
- bcrypt at cost 10. Default seeded password: `Meclones123!`.
- `middleware.ts` enforces `/portal/*` ACL via `PORTAL_ACL` in `auth.config.ts`. Wrong-role users get redirected to their own home.
- `/portal/me` is a forwarder that reads the session and `redirect()`s to the role's home dashboard.
- Roles: `SUPER_ADMIN | DIRECTOR | ADMIN | ACCOUNTANT | TEACHER | STUDENT | PARENT`. Super-admin and director both land on `/portal/director`.
- Granular admin permissions stored in `AdminPermissions` (one row per ADMIN/ACCOUNTANT) — togglable at `/portal/director/permissions`.

### Demo accounts (all password `Meclones123!`)

```
SUPER_ADMIN   superadmin@meclonescollege.com
DIRECTOR      director@meclonescollege.com
ADMIN         admin@meclonescollege.com
ACCOUNTANT    accountant@meclonescollege.com
TEACHER       teacher@meclonescollege.com         (Mrs. Adaeze Obi)
STUDENT       student@meclonescollege.com         (Yusuf Bello, SS 3A)
              or admission #: MCL/SS3A/2526/001
PARENT        parent@meclonescollege.com          (Dr. Aisha Bello)
```

---

## 5 · Prisma schema — every model

```
auth/identity     User, AdminPermissions, PasswordResetToken
people            Student, Parent, ParentStudent, Teacher
academic          Class, Subject, ClassSubject, SubjectTeacher,
                  ClassTeacher, AcademicSession, Term
records           Result, Attendance, Fee, FeeStructure, Payment,
                  StudentNote, Award, HealthRecord, DisciplinaryCase
content           Announcement, GalleryImage, BlogPost
admissions        Admission (from public website form)
website           ContactMessage
library           Book, BookRequest
complaints        Complaint
whatsapp          WhatsAppSession, WhatsAppMessage
ops               Notification, AuditLog
```

Key enums: `Role`, `Gender`, `Level (JSS/SSS)`, `TermName (FIRST/SECOND/THIRD)`,
`AttendanceStatus`, `FeeStatus`, `PaymentMethod/Status`, `AnnouncementAudience`,
`AdmissionStatus`, `ComplaintCategory/Status`, `BookAvailability`,
`BookRequestType/Status`, `AwardCategory`, `StudentNoteCategory/Visibility`,
`NotificationType`, `BloodGroup`, `Genotype`,
`DisciplinaryCategory/Severity/Sanction/Status`.

---

## 6 · Railway environment variables (set on `meclones-college` service)

```
DATABASE_URL              ${{Postgres.DATABASE_URL}}   ← reference, not raw
AUTH_SECRET               <openssl rand -base64 32>
AUTH_TRUST_HOST           true
AUTH_URL                  https://meclones-college-production.up.railway.app
NEXT_PUBLIC_SITE_URL      https://meclones-college-production.up.railway.app

# Cloudinary (auto-upload works once these are set)
CLOUDINARY_CLOUD_NAME     dmuczlarv
CLOUDINARY_API_KEY        <set>
CLOUDINARY_API_SECRET     <set>

# Paystack (TEST mode currently)
PAYSTACK_SECRET_KEY       sk_test_...
PAYSTACK_PUBLIC_KEY       pk_test_...

# WhatsApp — shared secret for the n8n integration (existing)
WHATSAPP_WEBHOOK_SECRET   <set>

# WhatsApp Cloud API (NEW — only required if running the in-Next.js bot at /api/whatsapp/meta)
WHATSAPP_VERIFY_TOKEN     <any string, paste into Meta's webhook config>
WHATSAPP_PHONE_NUMBER_ID  <from your WhatsApp Business App>
WHATSAPP_ACCESS_TOKEN     <long-lived system-user token>

# RESEND (not set yet — email will log to stdout until configured)
RESEND_API_KEY            <unset>
RESEND_FROM               (optional)
ADMISSIONS_NOTIFY_EMAIL   (optional)
CONTACT_NOTIFY_EMAIL      (optional)
```

External Paystack dashboard config:
- **Webhook URL**: `https://meclones-college-production.up.railway.app/api/paystack/webhook` (needs to be set in Paystack dashboard)

---

## 7 · Features shipped — by area

### Public site
- Marketing site at all the standard routes
- Real photos from Cloudinary (the user uploaded 11 to `dmuczlarv`)
- Admission application form persists + emails school
- Contact form persists + emails school

### Auth
- Login with email OR admission number
- Forgot password → email → reset link (1-hour, single-use, SHA-256 hashed)
- Change password on profile page
- Admin password reset for any user from `/portal/admin/staff`

### Profile
- Every role can edit name, phone, profile photo (Cloudinary auto-upload)

### Director / Super Admin
- Overview dashboard with real Prisma counts
- Performance page with analytics
- Settings page (school info, grading scale, active session/term)
- Sessions lifecycle — close current + open new with auto-announcement
- Permissions — 11 toggles per admin user
- Audit Log viewer at `/portal/director/audit`

### Admin
- Student / Teacher / Parent CRUD (add + list + edit + deactivate)
- Bulk CSV student import with template download + per-row errors
- Class CRUD (refuses delete if students enrolled)
- Subject CRUD (refuses delete if results exist)
- Result publish/unpublish queue at `/portal/admin/results`
- Fee CRUD + Fee Structures (define line items once, apply to a class)
- Fee record-payment inline (cash/transfer/other)
- Admissions queue (status updates: review → exam → admitted/rejected)
- Attendance overview (school-wide + per-class drill-down)
- Library — books, request approval, rental tracking
- Awards — nominate students, 10 categories, displays on result slip
- Announcements — published with audience targeting (ALL/PARENTS/STAFF/STUDENTS/CLASS)
- Complaints inbox with start-working / resolve / close actions
- Staff & Accounts master view (password reset, activate/deactivate)
- WhatsApp send page per parent (templates + log)

### Teacher
- Dashboard with KPI panel (marks, coverage, scores, avg)
- **My Classes** — every class assigned to them
- **Class roster** — student-by-student view with photo + adm# + attendance + parent contact
- **Student detail** — comprehensive view with profile, parent contacts (tel+WhatsApp deep-links), awards, current-term results (own subjects highlighted), past-term history, **notes panel** (categorised observations + visibility control), attendance grid
- Mark attendance for assigned classes
- Score entry — saves drafts; admin approves before students see
- Notes can be marked PARENT_VISIBLE to bell-notify the parent

### Student
- Dashboard with stats + announcements
- Results (term selector, printable slip)
- Attendance log
- Fees (with **Pay Now** Paystack button)
- Library (browse + request books)

### Parent
- Dashboard — "My Children" cards with avatars, attendance %, fee balance, term average
- Per-child Results (with download Result Slip button)
- Per-child Attendance log
- Per-child Fees (with **Pay Now** Paystack)
- Complaints (file + see resolutions)
- Library (buy/rent books for child)
- WhatsApp opt-in field on profile

### Accountant
- Dashboard with fee collection stats
- (Shares the fees pages with Admin)

### Notifications & audit
- Real bell with unread count + dropdown + relative timestamps + poll every 60s
- Auto-notify on: announcement publish, result publish, complaint resolve, fee structure apply, Paystack payment success, **new message**, **class promotion**, **parent-visible student note**
- Audit log catches: password resets, activate/deactivate, session rotation, permission grant/revoke, announcement publish/delete, result publish/unpublish, complaint status changes, bulk student imports, student-note create/delete, **promotions**, **class moves**, **graduation/restore**

### Payments
- Paystack init/callback/webhook fully wired
- Receipt page at `/portal/parent/fees/receipt/[id]` (printable)
- Receipt email via Resend on success
- Idempotent: webhook + callback both safely apply

### Timetable (shipped after first doc revision)
- `TimetableEntry` model: classId × day × period (1–8) with subject + teacher + optional time/room/note. Unique on (classId, day, period).
- **Admin builder** at `/portal/admin/timetable` — class picker → inline editable grid per cell (subject + teacher dropdown). Period defaults configured in `components/TimetableGrid.tsx` (DEFAULT_PERIOD_TIMES).
- **Student** sees their class's grid at `/portal/student/timetable`
- **Parent** sees per-child grid at `/portal/parent/timetable`
- **Teacher** sees their own teaching schedule across all classes at `/portal/teacher/timetable` (cells coloured + class badge per period)

### Class promotion & graduation (shipped after first doc revision)
- `Student.graduatedAt` field — set when student passes SS 3 / leaves. Graduated students hide from active student lists but keep full history.
- `/portal/director/promotions`:
  - Preview table: every non-empty class → target class (same arm, name+1). SS 3 → "Graduate". Missing target classes flag as warnings and skip rather than fail.
  - "Run promotion" confirmation gate (type PROMOTE)
  - Recent graduates table with inline "Restore to…" dropdown to undo
- Server actions in `actions.ts`: `promoteAllStudents`, `moveSingleStudent`, `ungraduateStudent`
- `lib/promotion.ts` exports `nextLevelName()` (sync helper, importable from server components)

### Parent ↔ Teacher messaging (shipped after first doc revision)
- `MessageThread` (parent + teacher + optional student scope) + `Message` (author + body). Denormalised `lastMessageAt` + per-side unread counters for cheap inbox sorting.
- Server actions in `app/portal/messages/actions.ts`:
  - `startThreadAsParent` — parent picks teacher (filtered to teachers of their children's classes only)
  - `startThreadAsTeacher` — teacher picks parent + child (filtered to teacher's own classes; recipient picker groups by class)
  - `sendReply` — either side replies; increments other side's unread
  - `markThreadRead` — zero out caller's unread when they open thread
- Parent inbox at `/portal/parent/messages` · `/new` · `/[id]`
- Teacher inbox at `/portal/teacher/messages` · `/new` · `/[id]`
- "Message in portal" deep-link from teacher student-detail (per-parent)
- Shared `<ThreadView>` (now a client component; resets form state after submit)
- Bell notification fires on every new message + reply

### File attachments in messages (2026-05-24)
- One file per `Message` — fields `attachmentUrl/Name/Mime/Size`.
- New `lib/cloudinary.ts` helper `uploadAttachment` (resource_type "auto", preserves filename, folder `meclones/messages`).
- `/api/upload/attachment` POST route — 5 MB cap, accepts JPG/PNG/WebP/GIF/PDF.
- `<AttachmentPicker>` client component: uploads on pick, shows chip with size, exposes URL + meta via hidden inputs.
- Message bubbles render images inline (max-height 240); PDFs render as a download chip styled per side.

### Student health & medical records (2026-05-24)
- `HealthRecord` 1:1 with Student. Tracks blood group + genotype + allergies + chronic conditions + meds + immunisations + diet + height/weight + emergency contact (name/phone/relation, with tel + WhatsApp deeplinks) + family doctor + preferred hospital + HMO + policy # + last checkup + notes.
- Admin edit form at `/portal/admin/students/[id]/health`. Sticky-footer save bar; audit-logged on every save (`student.health.create|update`).
- Shared `<HealthCard>` component — colour-coded blocks (rose / amber / sky / emerald); empty state when no record.
- Surfaces in: admin student-detail (summary + inline edit), teacher student-detail (between awards and term results), and dedicated parent `/portal/parent/health` route listing every linked child.
- "Health" link in parent sidebar.

### Formal disciplinary cases (2026-05-24)
- `DisciplinaryCase` model — category (11 values: FIGHTING, BULLYING, ABSENTEEISM, LATENESS, UNIFORM, ACADEMIC_DISHONESTY, PROPERTY_DAMAGE, INSUBORDINATION, PHONE_MISUSE, BAD_LANGUAGE, OTHER) + severity (MINOR/MODERATE/MAJOR/SEVERE) + sanction (12 values incl. WARNING / DETENTION / SUSPENSION_1_DAY etc.) + status (OPEN/AWAITING_ACK/RESOLVED/APPEALED/ESCALATED).
- Parent acknowledgement workflow: sanction triggers AWAITING_ACK → parent ack (with optional note) → admin formally RESOLVED with note.
- Server actions in `app/portal/discipline/actions.ts`: `createDisciplinaryCase`, `updateDisciplinaryCase`, `resolveDisciplinaryCase`, `acknowledgeDisciplinaryCase`. All audit-logged.
- Bell-ping every parent on create; bell-ping reporter on parent ack; bell-ping parents + reporter on resolution.
- Pages:
  - **Admin**: `/portal/admin/discipline` (filter by status/severity/class) · `/new` · `/[id]` (edit + resolve forms)
  - **Teacher** (class-scoped): `/portal/teacher/discipline` · `/new` · `/[id]` (read-only)
  - **Parent**: `/portal/parent/discipline` · `/[id]` (with acknowledgement form)
- "Report incident" CTA on teacher + admin student-detail pages (deep-link with studentId).
- Recent-cases table embedded on admin student-detail page.
- Shared labels/tones in `lib/discipline.ts`.

### Class teacher daily roster — Homeroom (2026-05-24)
- New `/portal/teacher/roster` page — only available to form (class) teachers; others redirect.
- Single-pane daily view for the homeroom class:
  - Stats: roster size, present / late / absent / unmarked today
  - Today's roster table with photo + adm# + attendance badge + quick "Report incident" per row
  - Upcoming birthdays in next 30 days (year-aware)
  - Live (un-resolved) disciplinary cases for class members
  - Recent staff observations (StudentNote) across the class
  - Outstanding fee balances this term in the class
- "Homeroom" entry added to teacher sidebar between Dashboard and My Classes.

### WhatsApp Cloud API bot (2026-05-24) — Part 3 of brief
- `app/api/whatsapp/meta/route.ts` — GET verify (echoes `hub.challenge`) + POST receive (walks Meta payload, hands texts to FSM).
- `lib/whatsapp-fsm.ts` — finite state machine:
  - States: `AUTH_PENDING` (expects admission #) → `MAIN_MENU` → `AWAIT_TERM` (after Results) → `ESCALATED` (bot silent until parent says "menu")
  - Menu: 1) Results 2) Attendance 3) Fees 4) Announcements 5) Speak to Admin 0) Exit
  - Global reset tokens: "menu" / "main" / "0" / "exit" / "back" / "cancel"
  - Auto-binds session to student + first linked parent on successful admission # match
- `lib/whatsapp-cloud.ts` — Meta Cloud API sender (`sendWhatsAppText`, `sendAndLog`). Graph v20. `normaliseNgPhone()` for E.164.
- Every IN + OUT message persisted on `WhatsAppMessage`; sessions touched per inbound (lastActivity bump).
- Escalation: marks session `isEscalated`, bell-pings every active admin, audit logs `whatsapp.escalate`.
- No-ops cleanly when env not configured (so dev runs don't blow up; Meta's verify ping still 200s).
- The existing n8n REST endpoints stay in place — Mose can run either backend or both.

---

## 8 · Outstanding work — by priority

### 🔴 Bigger lifts left
- **Real PDF generation** — currently browser print → save-as-PDF. Wiring `@react-pdf/renderer` or Puppeteer would let us email PDFs as attachments and store them server-side. Investigation needed on Railway container size (Puppeteer's Chromium binary is ~250 MB).
- **WhatsApp bot — production go-live** — code is shipped; Mose still needs to: (1) create a Meta Business app, (2) set WHATSAPP_VERIFY_TOKEN / PHONE_NUMBER_ID / ACCESS_TOKEN on Railway, (3) configure the webhook in Meta with URL `https://meclones-college-production.up.railway.app/api/whatsapp/meta` and the same verify token, (4) submit for app review if going outside the test recipients list.

### 🟡 Important next
- **Email Resend** — wire `RESEND_API_KEY` on Railway so notification emails actually deliver (currently logging to stdout).
- **WhatsApp bot — more menu depth** — current menu only goes one level deep for Results (term picker). Could add: per-subject drill-down, fee receipt download links, complaint filing, parent password reset.
- **WhatsApp bot — interactive message types** — Meta supports interactive list + button payloads. Currently using plain text only. Upgrading would feel more like a modern bot but adds complexity.

### 🟢 Polish
- Notifications: persistence is solid but polling is 60s; could upgrade to Server-Sent Events.
- Make session cookie reflect new profile photo without re-login (JWT refresh on update).
- Mobile sidebar UX (lots of items, gets long).
- Per-page loading skeletons.
- Global search bar.
- Read receipts for messages.
- Notification preferences (parent opts in/out per type).
- 2FA for admin accounts.
- Backup / restore tooling.
- Multi-language UI (Yoruba / Igbo / Hausa).

---

## 9 · How to deploy + common gotchas

- `main` branch auto-deploys to Railway. Each push triggers:
  1. `npm install --prefer-offline --no-audit --no-fund`
  2. `npx prisma generate`
  3. `npm run build`
  4. Start command: `npx prisma db push --skip-generate --accept-data-loss && npm run start`
- **Schema changes go live automatically** via `prisma db push` at boot. No migration files yet.
- The Railway `meclones-college` project has TWO environments: `production` (live) and `meclones-college` (empty, ignore).
- For local dev I usually skip the DB push and just `npm run dev` against my own Postgres — the seed script (`npm run db:seed`) is idempotent.
- Use `npm run build` locally before pushing to catch type errors (Railway also catches them but takes ~3 min).
- If Railway hangs on "Deploy failed" but `/api/health` returns 200 OK, the restart-policy already recovered — ignore the stale status.

---

## 10 · Workflow with Mose

- He's hands-on, tests in prod, expects me to handle git + Railway ops
- Direct-push to `main` is the deploy mechanism
- Terse style; lead with the answer
- If a screenshot disagrees with text, the screenshot is the truth
- He has the Railway CLI authed as `naturabright2000@gmail.com`
- gh CLI installed at `~/.local/bin/gh`, authed as `go3net`
- Cloudinary cloud name: `dmuczlarv`

---

## 11 · Quick agent on-boarding (for the next Claude session)

If you're a fresh Claude picking this up:

1. **`cd ~/Downloads/meclones-college`** — that's where the code lives.
2. **`cat docs/PROJECT_STATUS.md`** — this file.
3. **`git log --oneline -20`** — last few features that landed.
4. **`grep -n "model " prisma/schema.prisma`** — see all models.
5. **`railway status`** — confirm we're still linked to `affectionate-integrity` / `production`.
6. **Mose will tell you what to build** — pick the highest-leverage item from §8 unless directed otherwise.
7. **Build incrementally, commit incrementally, push to deploy.** Don't batch 10 features into one commit.
