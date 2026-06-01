# Meclones College Lekki — Project Status

> **Read this first** when picking up the project in a fresh Claude session.
> Updated through commit `3206c75` (2026-05-25).
>
> ## ⚠ Strategic context — read this before you build anything
>
> This codebase is no longer just Meclones' deployment. It's a **white-label B2B SaaS template** Mose is selling to other Nigerian schools. The Meclones instance is the canonical reference deploy; every other school gets a fork with env vars overridden + a DB seeded for them. See §11 (Resell architecture) before adding hardcoded values anywhere — almost everything should be either env-driven or DB-driven so it survives across customers.
>
> Sales landing page: `/for-schools`. Setup guide: `docs/RESELL_SETUP.md`.

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
| Email       | Resend (live — RESEND_API_KEY set on Railway)  |
| PDF         | `@react-pdf/renderer` — result slips + finance reports |
| 2FA         | `otplib` + `qrcode` — optional TOTP per user + recovery codes |
| Website AI  | `@anthropic-ai/sdk` — Sonnet 4.5 chatbot on public site (key live) |
| Realtime    | Server-Sent Events for the notification bell    |
| PWA         | manifest.ts + appleWebApp metadata; installable |
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
auth/identity     User (with totpSecret + totpEnabledAt for 2FA),
                  AdminPermissions, PasswordResetToken, NotificationPrefs,
                  TwoFactorRecoveryCode
people            Student (+ branchId), Parent, ParentStudent,
                  Teacher (+ branchId)
academic          Class (+ branchId, unique on (branchId,name,arm)),
                  Subject, ClassSubject, SubjectTeacher,
                  ClassTeacher, AcademicSession, Term
records           Result, Attendance, Fee, FeeStructure (+ branchId),
                  Payment (with reconciliation fields), StudentNote,
                  Award, HealthRecord, DisciplinaryCase, StudentTermReport
                  (class teacher + principal comments)
messaging         MessageThread (+ parentLastReadAt / teacherLastReadAt
                  for read receipts), Message (with attachment fields)
schedule          TimetableEntry
multi-tenant      Branch, SchoolBrand (singleton logo + colors),
                  KnowledgeSection (chatbot KB)
content           Announcement (+ branchId), GalleryImage, BlogPost
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

# WhatsApp Cloud API (only required if running the in-Next.js bot at /api/whatsapp/meta)
WHATSAPP_VERIFY_TOKEN     <any string, paste into Meta's webhook config>
WHATSAPP_PHONE_NUMBER_ID  <from your WhatsApp Business App>
WHATSAPP_ACCESS_TOKEN     <long-lived system-user token>

# Resend (LIVE — set by Mose 2026-05-25)
RESEND_API_KEY            <set>
RESEND_FROM               (optional; defaults to "Meclones College <noreply@meclonescollege.com>")
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

### Discipline + new-message emails (2026-05-25)
- `sendDisciplinaryCaseFiledEmail` — to every linked parent on case creation. Severity-coloured chip, sanction line, description in a quote box. "Action required" banner when the case starts `AWAITING_ACK`.
- `sendDisciplinaryResolvedEmail` — green resolution-note quote box.
- `sendNewMessageThreadEmail` — to the recipient on the first message of a thread (replies don't email — intentional to avoid spam). Subject + body preview + 'about <child>' line + attachment indicator.
- All HTML-escape user-supplied content via `escapeHtml()` helper inside `lib/resend.ts`.
- Wired into `createDisciplinaryCase`, `resolveDisciplinaryCase`, `startThreadAsParent`, `startThreadAsTeacher`.

### Real PDF result slips (2026-05-25)
- `@react-pdf/renderer` — server-rendered, no Chromium binary on Railway.
- Endpoint: `GET /api/results/[studentId]/slip.pdf?termId=...` — same auth as the HTML page (staff for any; parent for linked children; student for self; teacher for own-class students).
- Component: `components/ResultSlipPdf.tsx` — mirrors the existing HTML slip's layout (letterhead, info grid, academic table with colour-coded grade chips, 4-up summary, attendance, awards, signature lines).
- Shared loader `lib/result-slip-data.ts` feeds both HTML and PDF so they're always in lock-step.
- Auto-attach: when admin publishes a class's results, each student's PDF is rendered once and attached to every linked parent's + student's "Results published" email.

### Welcome / set-password emails on user create (2026-05-25)
- `lib/password-reset.ts` `createResetToken` now takes optional `ttlHours` — onboarding uses 168h / 7 days vs the default 1h for normal reset.
- `sendWelcomeEmail` (PARENT / TEACHER / STAFF flavors) — branded header, "Set your password" CTA, login-email reminder, plus a "Linked to your account" block listing children with admission # + class for parent welcomes.
- Wired into: `createParent` (with children list when studentIds are picked), `createTeacher` (only on truly-new users — the action is upsert-shaped), `createStudent` (when a parent email/name is provided AND the parent User didn't exist), and the bulk CSV import (fire-and-forget per new parent so a Resend hiccup doesn't stall a large import).
- The existing reset-password page accepts these tokens — no UI change needed.

### Per-user email notification preferences (2026-05-25)
- `NotificationPrefs` model 1:1 with User. Lazy-created on first toggle.
- Settings page at `/portal/me/notifications` — toggles for: results published, fee charged, disciplinary resolved, new message thread, announcements, complaint resolved.
- Always-on (never opt-out): password reset, welcome, payment receipt, disciplinary case **filed** (resolution is opt-out-able), admissions confirmation.
- `lib/notification-prefs.ts` — `canEmail(userId, key)` fails open (returns the default `true`) on DB error so infra hiccups don't silently mute critical comms.
- Wired into all five opt-out-able call sites + a link on the profile page.

### Staff creation UI + Resend welcome button (2026-05-25)
- `/portal/admin/staff` now has a "Create staff account" form (DIRECTOR / SUPER_ADMIN only). Creates a User with role ADMIN / ACCOUNTANT / DIRECTOR, sets a random unguessable temp password, sends the welcome email.
- Every non-student user row has a "Resend welcome" button — re-issues the 7-day set-password link. Privilege rule reused from `resetUserPassword`: plain ADMIN can resend for parents/teachers/students; staff resends require DIRECTOR+.
- Students filtered out (their `@meclones.local` auto-generated emails aren't real inboxes).
- Audit log: `user.create_staff`, `user.resend_welcome`.

### Two-factor authentication (2026-05-25)
- `otplib` + `qrcode` — standard RFC 6238 TOTP, 30s step, 1-step window. Compatible with Google Authenticator, Authy, Microsoft Authenticator, 1Password.
- `User.totpSecret` + `User.totpEnabledAt`. The secret is set during enrol but only `enabledAt` flips when the user verifies a code — interrupted enrolments never lock anyone out.
- `lib/totp.ts` — lazy-configures otplib's authenticator so Next's page-data collector doesn't choke on top-level mutation.
- Settings page at `/portal/me/security` — start enrol → QR + manual secret display + verify input → enabled. Disable requires re-entering password.
- Login: `auth.ts` credentials provider now reads an optional `totpCode`. When `totpEnabledAt` is non-null, the code is required and verified — missing/wrong returns null with no info-leak about which factor failed.
- Login form has a "Use 2FA code" toggle that reveals a 6-digit input (numeric inputMode + one-time-code autocomplete). Error copy hints at the toggle on first failure.
- Audit: `user.2fa_enabled`, `user.2fa_disabled`.

### 2FA recovery codes (2026-05-25)
- New `TwoFactorRecoveryCode` model. SHA-256-hashed (raw values are shown once, never retrievable).
- 10 codes issued per batch in `xxxxx-xxxxx` format using a no-ambiguous-chars alphabet (no `0/1/o/l`).
- On enrolment confirm: codes auto-generated and stashed in a short-lived `2fa_codes_once` cookie so the next page render shows them once. Cookie is `httpOnly`, scoped to `/portal/me/security`, 10-min TTL, deleted on read.
- Regenerate flow on the security page — replaces the whole batch, requires the user's password.
- Login: `auth.ts` accepts either a 6-digit TOTP code OR a `xxxxx-xxxxx` recovery code; recovery codes are consumed atomically via `consumeRecoveryCode`. Login form input now accepts up to 11 chars and copy says "6-digit code or one of your recovery codes".
- Audit: `user.2fa_recovery_codes_regenerated`.

### Accountant panel overhaul (2026-05-25)
- Was bare-bones (dashboard + debtors); now a real finance workspace.
- **Dashboard**: term collection % hero with progress bar + this-month / today payment totals; per-class collection bars colour-coded by health (≥80% emerald, ≥50% amber, else rose); per-fee-type breakdown; recent payments feed; top defaulters with parent contact + tap-to-call + WhatsApp deeplink.
- **Payments ledger** at `/portal/accountant/payments` — chronological, filterable (search / method / status / date range), 50/page pagination, CSV export at `/api/accountant/payments/csv`.
- **Manual payment entry** at `/portal/accountant/record-payment` — cash / transfer / POS / cheque; routes through `lib/apply-payment.ts` so the same code path runs as Paystack (idempotent on reference, creates Payment row, updates Fee, bell-pings, sends receipt). Audit `payment.manual_recorded`.
- **Reminders** at `/portal/accountant/reminders` — per-class debtor preview with reachable-parent count; compose form with optional custom message; bulk bell + email blast. New template `sendFeeReminderEmail`.

### Accountant reports + reconciliation + receipt resend (2026-05-25)
- **Schema**: `Payment` gains `reconciledAt`, `reconciledById`, `reconciledByName`, `bankReference`, `reconciliationNote` + index on `reconciledAt`.
- **Finance Report PDF** (`@react-pdf/renderer`) at `/api/accountant/finance-report.pdf` + on-screen preview at `/portal/accountant/reports`. Date range presets (today / 7d / month / 90d / custom). PDF sections: KPI strip → method breakdown → per-class breakdown → per-fee-type → top 15 debtors with parent contact → line-item payments (capped 200 rows).
- **Reconciliation** at `/portal/accountant/reconciliation`. Two tabs (to reconcile / reconciled); method filter (usually TRANSFER/POS/CHEQUE); multi-select + bulk mark with bank reference + note; undo per row. Audit `payment.reconciled` / `payment.unreconciled`.
- **Resend receipt** — button on every SUCCESS row in the ledger. Action `resendPaymentReceipt` re-emails to every linked parent + student (skips synthetic `@meclones.local` addresses). Audit `payment.receipt_resent`.

### Global search (2026-05-25)
- Staff-only (DIRECTOR / ADMIN / ACCOUNTANT / TEACHER). Parents/students get bounced.
- `/portal/search?q=...` queries six entity types in parallel: students, teachers, parents, classes, subjects, disciplinary cases, payments. Teacher results scope to own classes.
- Search box embedded in the `PortalShell` header (md+ screens), with a mobile shortcut icon on smaller. Both submit to the same page.
- Each entity has its own card; click-through goes to the role-appropriate detail page (e.g. teacher hits `/portal/teacher/students/[id]`, admin hits `/portal/admin/students/[id]`).

### WhatsApp bot v2 — phone auto-auth + teacher + payments + timetable (2026-05-25)
- Major FSM rewrite (`lib/whatsapp-fsm.ts`, ~920 lines).
- **Phone-based auto-auth**: on first inbound from a phone number, we normalise + try to match `User.phone` (handles `+234…` / `0…` / 10-digit variants). Found → auto-bind session. Role determines flow.
- **Parents**: greeted with name + currently-viewed child; multi-child parents see a "Switch to another child" menu option that flips into `CHOOSE_CHILD` state.
- **Teachers**: separate menu — My classes / Today's schedule / Recent discipline (mine) / Announcements / Speak to admin.
- **Pay Now**: option 3 lists outstanding fees + per-fee Paystack init links (calls `initTransaction` with the parent's email + `WA-<feeId>-<timestamp>` reference). Idempotent on reference like the web flow.
- **Timetable**: option 4 returns a per-day Mon-Fri breakdown for the child's class.
- New formatters: `formatParentMenu`, `formatTeacherMenu`, `formatChildPicker`, `formatTimetable`, `formatPayPrompt`, `formatTeacherClasses`, `formatTeacherSchedule`, `formatRecentDiscipline`.
- Reset tokens unchanged: `menu / main / 0 / exit / back / cancel`. Staff request keywords (`9 / admin / help / human`) escalate immediately.

### Website AI chatbot (2026-05-25)
- `@anthropic-ai/sdk` with a Claude Haiku-class model.
- Floating chat widget on the public site (`components/WebsiteChatWidget.tsx`); persists conversation in `sessionStorage` so a refresh doesn't lose it.
- Streaming `/api/website-chat/route.ts` endpoint with system prompt seeded from `lib/school-knowledge.ts` — admission process, fees, programs, contact, calendar, transportation, uniform policy, etc.
- Aggressively grounded in actual school data (`SCHOOL` constants); the model is instructed to escalate to phone/email when it doesn't know.
- Optional: when a visitor leaves contact details ("call me on 080...") the chatbot can persist a `ContactMessage` for follow-up (not auto-triggered; left as a future improvement).
- Falls back to a static FAQ when `ANTHROPIC_API_KEY` is not set, so the widget still works in staging.

### Read receipts on parent ↔ teacher threads (2026-05-25)
- Schema: `MessageThread.parentLastReadAt` + `teacherLastReadAt`.
- `markThreadRead` now stamps the appropriate timestamp alongside the existing unread-counter zero-out.
- `ThreadView` accepts `peerLastReadAt`; scans messages newest-backward to find the last own-message with `createdAt <= peer's stamp` and renders a `CheckCheck` icon + "Seen <time>" tag on that bubble only (no clutter).

### Report-card overhaul — class teacher + principal comments + gradebook (2026-05-25)
- New `StudentTermReport` model (1 row per student × term × session) holds the class teacher's overall comment + the principal's comment with author snapshots. Separate from per-subject `Result.comment`.
- **Class teacher comments** at `/portal/teacher/comments` — form teacher writes a textarea per student in their homeroom. One submit handles the whole class. Auth-gated to `classTeacherId`.
- **Homeroom gradebook** at `/portal/teacher/homeroom-gradebook` — read-only matrix (students × subjects) with totals, colour-coded grades, class position computed from sum of totals. Sticky first column. Header: students / subjects / class avg / scoring complete %.
- **Principal comments** at `/portal/director/comments` — director picks any class, sees the class teacher's note as context, writes their own remark per student.
- **Result slip** (HTML + PDF) now renders a "Comments" section between Awards and Signatures: slate-bordered class teacher box, gold-bordered principal box, with author names on the signature lines.
- Audit: `term_report.class_teacher_comments_saved`, `term_report.principal_comments_saved`.

### Bulk exports + portable backup (2026-05-25)
- New `/portal/director/exports` landing page with cards for every download.
- Shared `lib/csv.ts` — RFC 4180 escaping + response helper + date stamp.
- CSV endpoints (ADMIN+, audit-logged):
  - `/api/admin/export/students` — active student roll + parent contacts. `?includeGraduated=1` to add alumni.
  - `/api/admin/export/teachers` — subjects, form-class duty, classes, contact.
  - `/api/admin/export/parents` — linked children + contact + WhatsApp opt-in.
  - `/api/admin/export/attendance` — per-student counts for the active term.
  - `/api/admin/export/results` — long-format result rows for the active term (toggle `?publishedOnly=1`). Pivot in Excel for the broadsheet.
- **Full DB backup** at `/api/admin/export/backup` (DIRECTOR / SUPER_ADMIN only) — single JSON of every domain table with `schemaVersion` header. Excludes `passwordHash` + `totpSecret`. Notifications + audit log capped at 10k rows. Audit `export.full_backup`.

### Mobile UX: bottom tab bar + scrollable sidebar (2026-05-25)
- New `<MobileBottomNav>` component renders for parent / teacher / student roles only on mobile (`<md`). 4 tabs each — Home, primary action, secondary action, Messages-or-Fees depending on role.
- PortalShell main padding bumped (`pb-20 lg:pb-6`) so content isn't hidden behind the bottom bar.
- Bottom bar uses `env(safe-area-inset-bottom)` so iOS notches don't eat tabs.
- Bug fix: sidebar `<aside>` was `lg:flex flex-col` — meant the inner nav's `flex-1 overflow-y-auto` didn't activate on mobile and long sidebars got cut off. Changed to `flex flex-col` always; added `overscroll-contain` and `-webkit-overflow-scrolling: touch`. Now scrolls smoothly with rubber-banding contained.

### Admin disciplinary stats (2026-05-25)
- `/portal/admin/discipline/stats` — analytics page admin/director/super-admin.
- Time-scope filter: current term / current session / all time. Uses Term.startDate + Session.startDate where set; coarse 90-day / 12-month fallbacks.
- Headline tiles + 6-month CSS-only trend bars (major/severe overlay in rose).
- Status × severity panel; by-category and by-sanction horizontal bars.
- Per-class hot spots table with cases per 10 students.
- Recurring-offenders top-15 list with click-through to student admin page.

### JWT session refresh on profile edit (2026-05-25)
- `auth.config.ts` `jwt()` callback now handles `trigger === "update"` from `useSession().update({ name, image })`. Merges new display fields into the JWT without a sign-out round-trip.
- `<ProfileSessionRefresher>` client component on the profile page calls `update()` when the URL has `?updated=1` (set by the server action's redirect after save), then strips the query so a manual refresh doesn't re-fire.
- Sidebar avatar / header name now refresh immediately after a profile save.

### SSE notification bell (2026-05-25)
- New `/api/notifications/stream` endpoint returns `text/event-stream`. Server re-queries DB every 5s and pushes `event: snapshot` only when the snapshot hash changes. Heartbeat comment every 25s keeps reverse-proxies from killing the connection.
- `NotificationsBell` consumes `EventSource`; auto-falls back to the existing 60s polling refresh after 3 failures so the bell never goes permanently silent.

### Cron-scheduled JSON backup (2026-05-25)
- Backup-building extracted into `lib/backup.ts` so manual + cron endpoints stay in lock-step.
- New `/api/cron/backup` accepts GET/POST with Bearer auth (`CRON_SECRET`) — generates the same JSON snapshot as the on-demand export, uploads to Cloudinary as a raw file under `meclones/backups/`. Audit `backup.cron_success` / `backup.cron_failed`.
- `/portal/director/exports` shows the last successful + last failed backup timestamps with a "How to schedule it" expandable guide.
- New `uploadRawBuffer()` helper in `lib/cloudinary.ts` uses `resource_type: "raw"` so JSON files aren't image-processed.

### Loading skeletons (2026-05-25)
- `components/Skeleton.tsx` ships `SkeletonBox / StatTile / StatRow / Card / Table / Header / PageSkeleton` primitives.
- `loading.tsx` files dropped into all high-traffic route segments: parent/teacher/admin/director/accountant/student dashboards + every admin list page + the payments ledger + the homeroom roster.
- Replaces the blank-page-→-flash-of-content with a graceful shimmer while server components fetch.

### PWA — installable portal (2026-05-25)
- `app/manifest.ts` (Next.js metadata API) exposes the manifest as `/manifest.webmanifest`.
- Root layout sets `appleWebApp` + `manifest` + theme color metadata.
- New `<PwaInstallPrompt>` component shows the install banner on supported browsers.

### Public chat polish (2026-05-25)
- Removed the duplicate WhatsApp FAB from the public layout; the chatbot now has a WhatsApp shortcut footer link inside it (one CTA, not two competing FABs).
- Chatbot launcher + header use a human-friendly avatar (Headphones icon, with an online green dot) instead of the abstract Sparkles + M monogram.
- Static FAQ fallback (`lib/school-faq.ts`) — 10 keyword-matched answers for the most common public-website questions, used when `ANTHROPIC_API_KEY` isn't set OR when the LLM call fails. No more "I'm not fully wired up" stub.
- Chatbot model upgraded to **Claude Sonnet 4.5** (was Haiku 4.5). Max tokens 2048. System prompt rebuilt with a concrete "two jobs" framing + Nigerian-English tone instructions + per-question-type handling rules + a hard "never do" list (no invented fees, no fake teacher names, no asking for passwords).

### White-label resell · Phase 1 — env-driven identity (2026-05-25)
- `lib/constants.ts` `SCHOOL` block now reads from `SCHOOL_NAME`, `SCHOOL_PHONE`, `SCHOOL_EMAIL`, `SCHOOL_ADDRESS`, `SCHOOL_SHORT_NAME`, `SCHOOL_TAGLINE`, `SCHOOL_HOURS`, `SCHOOL_WEBSITE`, `SCHOOL_WHATSAPP`, `SCHOOL_FACEBOOK / INSTAGRAM / TWITTER / YOUTUBE / LINKEDIN`, `SCHOOL_STATS_*`. Meclones defaults preserved.
- New `SCHOOL_CODE` env var replaces hardcoded `"MCL"` admission-number prefix. Threaded through the seed script + student create + bulk import.
- New `PUBLIC_SITE_ENABLED` flag (env `ENABLE_PUBLIC_SITE`). When false, every route under `(public)/` redirects to `/portal/login` — schools that already have their own website point a subdomain at the deployment and only the portal lives there.
- `docs/RESELL_SETUP.md` — step-by-step guide for spinning up a new school customer in ~30 minutes (env vars, Railway setup, Paystack + Cloudinary + Resend + Anthropic, seeding, custom domain DNS, per-customer cost estimate).

### White-label resell · Phase 2 — multi-branch / multi-campus (2026-05-25)
- New `Branch` model (`code`, `name`, `address`, `phone`, `email`, `isMain`, `isActive`). Optional `branchId` added to Student / Teacher / Class / FeeStructure / Announcement. Optional at DB layer so `prisma db push` doesn't need migrations; app code defaults to Main on every create.
- Class unique constraint changed from `(name, arm)` → `(branchId, name, arm)` so JSS 1A can exist in both Lekki and Ikeja.
- `lib/branch.ts` helpers: `ensureMainBranch` (idempotent first-boot create), `getActiveBranchIdFromCookie`, `byActiveBranch` (Prisma where-clause fragment), `resolveBranchIdForCreate` (Main fallback for inserts), `listBranches`, `activeBranchCount`.
- `/portal/admin/branches` (DIRECTOR / SUPER_ADMIN only) — CRUD page with add form, inline edit, activate/deactivate. Main branch can't be deactivated.
- `<BranchSwitcher>` chip in portal header — client component that hits `/api/branches` on mount; auto-hidden when there are fewer than two active branches (single-branch deployments never see it).
- Setting the switcher writes a `branch` cookie via `setActiveBranch` server action. Lists at `/portal/admin/students`, `teachers`, and `classes` filter via `byActiveBranch()`. New records inherit the active branch.
- Audit log: `branch.create / update / activate / deactivate`.

### White-label resell · Phase 3 — chatbot KB in DB + logo upload + brand admin (2026-05-25)
- New `KnowledgeSection` model (key, title, body, sortOrder, isActive). `buildSchoolKnowledge()` in `lib/school-knowledge.ts` is now async — reads active sections from DB, falls back to the hardcoded Meclones template when the table is empty.
- `/portal/admin/knowledge` — admin UI for the chatbot's knowledge base. List/create/edit/activate/delete/reorder sections. One-click "Seed default sections" button copies the Meclones template into the DB so customers have something to edit instead of starting blank.
- Chatbot route now builds the system prompt fresh per request (one extra DB hit) so admin edits propagate without a redeploy.
- New `SchoolBrand` singleton (id=`"default"`): `logoUrl`, `logoSquareUrl`, `primaryHex`, `accentHex`.
- `/portal/director/branding` (DIRECTOR / SUPER_ADMIN only) — logo upload (PNG/JPG/WebP/SVG, 2 MB, via new `/api/upload/logo` → Cloudinary `meclones/branding/`) for both wide + square variants, plus primary + accent hex picker with live swatch.
- `<Logo>` component is now a client component that fetches `/api/brand` once (module-level promise memo); renders the uploaded wide logo if present, falls back to a square-logo-or-monogram badge using **`SCHOOL.shortName`'s first letter** so a school called "Greensprings" shows "G" not "M".
- Audit log: `knowledge.create / update / activate / deactivate / delete / seed_defaults` and `brand.update / brand.clear`.

### Sales landing page · `/for-schools` (2026-05-25)
- Marketing page Mose can point prospective school customers at: `https://meclonescollege.com/for-schools`.
- Hero with two CTAs (request demo / see pricing) + 4 trust stats (modules count, onboarding time, data-portability, fee-take = N0).
- 8-up feature grid covering every shipped module.
- 4 pricing tiers (Starter / Pro / Multi-branch / Enterprise) with Naira-per-term prices.
- 'Built for Nigerian schools' section + Meclones testimonial card.
- Demo request form (client component) — posts to existing `/api/contact` with role='Prospective school operator' so the email arrives tagged. No schema changes needed.
- 7-question FAQ accordion covering common objections (replacement vs co-existence with existing website, data import, Paystack take-rate, customisation, ownership).
- Lives under `(public)/` so customer white-label deployments with `ENABLE_PUBLIC_SITE=false` never show it — only Mose's canonical Meclones site has it.

---

## 8 · Outstanding work — by priority

### 🔴 Needs Mose's action (no code work left)
- **WhatsApp bot — production go-live** — code is shipped; Mose still needs to: (1) create a Meta Business app with WhatsApp Cloud API, (2) set `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` on Railway, (3) configure the webhook in Meta with URL `https://meclones-college-production.up.railway.app/api/whatsapp/meta` and the same verify token, (4) make sure every parent's `User.phone` is set to their actual WhatsApp number.
- **Scheduled backup cron job** — set `CRON_SECRET` on Railway + add a daily cron service hitting `POST /api/cron/backup` with `Authorization: Bearer $CRON_SECRET`. Backups will then auto-upload to Cloudinary nightly.
- **Anthropic key** — already set; if it ever gets revoked, the chatbot falls back to the static FAQ in `lib/school-faq.ts`.

### 🟡 Worth doing next (resell-relevant)
- **Phase 3.5 — runtime Tailwind palette swap** — `SchoolBrand.primaryHex / accentHex` are stored but not yet wired into Tailwind utilities at runtime. Defer until a real customer asks for full re-coloring; the brand admin page already accepts and previews the values.
- **WhatsApp interactive message types** — Meta supports buttons + list payloads. Current bot uses plain text only.
- **Notification email digests** — parents could opt for daily/weekly digests instead of per-event emails to further reduce volume.

### 🟢 Polish / nice-to-haves
- Multi-language UI (Yoruba / Igbo / Hausa).
- Inter-branch student transfer flow (today admins do it manually by changing classId).
- Per-branch fee structures (schema supports it; UI doesn't surface the picker yet).

---

## 11 · Resell architecture (read before adding features)

The codebase serves two audiences simultaneously:

1. **Meclones College Lekki** — the canonical deployment at https://meclones-college-production.up.railway.app. Has the marketing site (`ENABLE_PUBLIC_SITE=true`) + the portal.
2. **Other school customers** — fork the repo (or use it as a template), set their own env vars, deploy on a separate Railway project pointing at their own Postgres + Cloudinary + Paystack accounts. Usually `ENABLE_PUBLIC_SITE=false` so only the portal is live at e.g. `portal.theirschool.com`.

**Rules when adding features:**
- **Never hardcode school-specific values.** Use `SCHOOL.*` from `lib/constants.ts` (which already reads env). For new values, add an env var with a Meclones-defaulting fallback in that file.
- **Never assume the marketing site is live.** Code that depends on `(public)/` routes should respect `PUBLIC_SITE_ENABLED` from `lib/constants.ts`.
- **Branch-scope new records.** When creating Student / Teacher / Class / FeeStructure / Announcement, set `branchId` via `resolveBranchIdForCreate()`. When listing, filter via `byActiveBranch()` for staff routes.
- **Chatbot answers** — if you need to teach the bot something school-specific, add it as a `KnowledgeSection` so customers can edit it. Don't bake it into `lib/school-knowledge.ts` unless it applies universally.
- **Audit-log per-customer-relevant actions.** The audit log is part of the data export every school exports; meaningful action names help auditors.

**Pricing tiers** (informal — not enforced in code):
- Starter: ~₦80–150k/term · 1 campus · ≤ 300 students
- Pro: ~₦200–350k/term · 1 campus · unlimited students · WhatsApp + AI chatbot
- Multi-branch: ~₦400–700k/term · up to 5 campuses
- Enterprise: ₦800k+/term · custom

See `docs/RESELL_SETUP.md` for the actual deployment checklist.

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
