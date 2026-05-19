# Meclones College Lekki — Project Status

> **Read this first** when picking up the project in a fresh Claude session.
> Updated through commit `83629b1` (2026-05).

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
| WhatsApp    | Manual deep-links + n8n REST endpoints (no Cloud API webhook yet) |
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
                  StudentNote, Award
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
`NotificationType`.

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

# WhatsApp Cloud API (NOT YET WIRED to a bot — only used as a shared
# secret for n8n calling our /api/whatsapp/* endpoints)
WHATSAPP_WEBHOOK_SECRET   <set>

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
- Auto-notify on: announcement publish, result publish, complaint resolve, fee structure apply, Paystack payment success
- Audit log catches: password resets, activate/deactivate, session rotation, permission grant/revoke, announcement publish/delete, result publish/unpublish, complaint status changes, bulk student imports, student-note create/delete

### Payments
- Paystack init/callback/webhook fully wired
- Receipt page at `/portal/parent/fees/receipt/[id]` (printable)
- Receipt email via Resend on success
- Idempotent: webhook + callback both safely apply

---

## 8 · Outstanding work — by priority

### 🔴 Critical missing
- **WhatsApp Cloud API bot state machine** — only the n8n REST endpoints exist; the actual "parent texts → bot replies with results/fees/attendance" flow isn't wired. The brief Part 3 work is half-done.
- **Result slip PDF as actual PDF** — currently we use browser print → save as PDF. Real PDF generation (e.g. via @react-pdf/renderer) would let us email PDFs as attachments and store them.

### 🟡 Important next
- **Timetable** — no schema, no UI yet. Standard expectation.
- **Class promotion** at session rotation — JSS1A → JSS2A bulk move. Currently students stay on their old class through a rotation.
- **Disciplinary records** — `StudentNote` with category=BEHAVIOUR is close, but a dedicated record could include sanctions, parent acknowledgement, etc.
- **Parent-teacher direct messaging** — currently parents file complaints to the admin office; no direct line to a specific teacher.
- **Health / medical records** — emergency contacts, allergies. New model.
- **Email Resend** — wire `RESEND_API_KEY` on Railway so the notification emails actually deliver (currently logging to stdout).

### 🟢 Polish
- Notifications: persistence is solid but polling is 60s; could upgrade to Server-Sent Events.
- Make session cookie reflect new profile photo without re-login (JWT refresh on update).
- Real photo upload for awards (currently just the student's existing photo).
- Mobile sidebar UX (lots of items, gets long).
- Per-page loading skeletons.

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
