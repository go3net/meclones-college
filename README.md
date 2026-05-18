# Meclones College Lekki

Full-stack school management platform for **Meclones College Lekki** (Lagos, Nigeria).

Three parts, built on a single Next.js 14 + Prisma + PostgreSQL stack:

1. **Public website** — marketing site replacing meclonescollege.com
2. **School portal** — multi-role (Admin / Teacher / Student / Parent)
3. **WhatsApp automation** — parent self-service via Meta WhatsApp Cloud API + n8n

---

## Stack

| Layer    | Tool                                       |
| -------- | ------------------------------------------ |
| Framework | Next.js 14 (App Router) + TypeScript      |
| Styling  | Tailwind CSS, custom design system        |
| DB       | PostgreSQL via Prisma ORM (Railway-hosted) |
| Auth     | NextAuth v5 (credentials, role-based)     |
| Media    | Cloudinary                                |
| Payments | Paystack                                  |
| Email    | Resend                                    |
| WhatsApp | Meta WhatsApp Cloud API + n8n             |
| Hosting  | Railway                                   |

---

## Getting started

```bash
# Install
npm install

# Configure env
cp .env.example .env.local
# (fill in DATABASE_URL, RESEND_API_KEY, etc.)

# DB
npx prisma generate
npx prisma db push      # or: npx prisma migrate dev

# Dev server
npm run dev
```

The app boots at `http://localhost:3000`.

---

## Scripts

| Script              | Purpose                                  |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Local dev server                         |
| `npm run build`     | Prod build (runs `prisma generate` first) |
| `npm run start`     | Run prod build                           |
| `npm run lint`      | ESLint                                   |
| `npm run db:push`   | Push schema → DB (no migration files)    |
| `npm run db:migrate`| Create + apply a Prisma migration        |
| `npm run db:studio` | Open Prisma Studio                       |

---

## Project layout

```
app/
├── (public)/         Marketing site: /, /about, /academics, /admission,
│                     /apply, /book-visit, /contact, /gallery, /news, /parents
├── portal/           Multi-role portal: /portal/login, /admin, /teacher,
│                     /student, /parent, /director, /accountant
└── api/
    ├── admissions/   POST: create admission, send Resend emails
    └── contact/      POST: log enquiry, notify info@

components/           Shared UI (Logo, PublicHeader, PublicFooter, ui.tsx,
                      PortalShell, WhatsAppFab, Animate)
lib/
├── constants.ts      School name, address, phone, email, stats, exams
├── prisma.ts         Prisma client singleton
├── resend.ts         Email helpers (admission, contact, alerts)
├── cloudinary.ts     Media upload helpers
├── auth.ts           Demo localStorage auth (placeholder for NextAuth wiring)
├── mock-data.ts      Seed data for portal demo
└── store.ts          localStorage store for portal demo state
prisma/
└── schema.prisma     Full DB schema for all three parts
```

---

## Deploying to Railway

The repo includes `railway.json` with build + start commands pre-wired:

- Build: `npm ci && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm run start`

On Railway:

1. Create a new project and provision a **PostgreSQL** plugin
2. Connect this repo as a service
3. Set env vars (copy from `.env.example`)
4. Deploy — Railway picks up `railway.json` automatically

Push to `main` triggers a deploy.

---

## What's implemented (so far)

**Part 1 — Public website**: ✅ all routes, branded design system, admissions form persists to DB, contact form persists to DB + emails the school, WhatsApp floating CTA, social links, real address/phone/email from the brief.

**Part 2 — Portal**: scaffolded route shells with localStorage demo auth for design preview. Real NextAuth + Prisma-backed dashboards are the next milestone.

**Part 3 — WhatsApp**: schema in place (`WhatsAppSession`, `WhatsAppMessage`), API routes still to come (`/api/whatsapp/verify-admission`, `/api/whatsapp/results`, etc).

---

## School info

- **Name**: Meclones College Lekki
- **Address**: Plot 19 Road 15, Lekki Atlantic Gardens, Alabeko, Eti Osa, Lagos
- **Phone**: 0806 024 6634
- **Email**: info@meclonescollege.com
- **Programs**: JSS 1–3, SS 1–3
- **Exams**: JAMB, WAEC, NECO, IELTS, SAT, TOEFL
