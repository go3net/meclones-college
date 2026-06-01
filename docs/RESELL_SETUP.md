# Spin up a new school portal in ~30 minutes

This codebase doubles as a turnkey school-portal product. To deploy it
for a new school customer, fork the repo (or use the original as a
template) and follow the checklist below. The whole flow is env-var
driven — you never edit code per customer.

---

## 0 · What you'll need from the school

Collect these up front so you can fill the env vars in one sitting:

- Legal school name + a short version (e.g. "Greensprings School Lekki" / "Greensprings Lekki")
- Tagline (one-line motto)
- Full physical address + a shorter version for footers
- Local phone + international (E.164) phone + WhatsApp number
- General email + admissions email
- Office hours
- Website URL (their existing one, if any)
- Social media URLs (optional — Facebook, Instagram, X/Twitter, YouTube, LinkedIn)
- A 2–4 character school code (used in admission numbers, e.g. `GSL/JSS1A/2526/001`)
- Whether they want the marketing site on this deploy or just the portal

---

## 1 · Create the Railway project

1. Go to https://railway.com → New Project → Deploy from GitHub repo
2. Pick the school-portal repo (your fork or this template)
3. Add a Postgres plugin to the same project — Railway will auto-inject `DATABASE_URL` via a reference variable

---

## 2 · Set environment variables

In Railway → service → Variables, set:

### Core auth + DB (mandatory)

| Name | Value |
|------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference, not raw) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_URL` | `https://<your-railway-domain>` |
| `NEXT_PUBLIC_SITE_URL` | same as AUTH_URL |
| `SEED_PASSWORD` | a temp password for the seeded super-admin (e.g. `ChangeMe123!`) |

### School identity (mandatory — pick what's relevant)

| Name | Default | Notes |
|------|---------|-------|
| `SCHOOL_NAME` | "Meclones College Lekki" | Full official name |
| `SCHOOL_SHORT_NAME` | "Meclones College" | For chat headers, emails |
| `SCHOOL_TAGLINE` | "Character. Excellence. Leadership." | One-liner |
| `SCHOOL_ADDRESS` | full street address |  |
| `SCHOOL_ADDRESS_SHORT` | shorter footer version |  |
| `SCHOOL_PHONE` | local format ("0806…") | shown in UI |
| `SCHOOL_PHONE_INTL` | "+234…" | used in WhatsApp links |
| `SCHOOL_EMAIL` | general inbox |  |
| `SCHOOL_ADMISSIONS_EMAIL` | admissions inbox |  |
| `SCHOOL_WHATSAPP` | "234…" digits only | WhatsApp deep-links |
| `SCHOOL_HOURS` | "Mon – Fri, 8:00am – 4:00pm" |  |
| `SCHOOL_WEBSITE` | their site URL |  |
| `SCHOOL_CODE` | "MCL" | 2–4 chars; admission-number prefix |
| `SCHOOL_FACEBOOK` etc. | social URLs | optional |

### Portal-only mode (set this for customers who already have a website)

| Name | Value |
|------|-------|
| `ENABLE_PUBLIC_SITE` | `false` |

When `false`, the marketing pages (`/`, `/about`, `/admission`, etc.) all redirect to `/portal/login`. The customer's existing site stays untouched; they just point a subdomain (e.g. `portal.theirschool.com`) at the Railway deployment.

### Cloudinary (file uploads + backups)

Create a free Cloudinary account → copy the three values from the dashboard:

| Name | Value |
|------|-------|
| `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | same |
| `CLOUDINARY_API_SECRET` | same |

### Payments — Paystack

| Name | Value |
|------|-------|
| `PAYSTACK_SECRET_KEY` | `sk_live_…` (test keys are fine for piloting) |
| `PAYSTACK_PUBLIC_KEY` | `pk_live_…` |

Then in the Paystack dashboard → Webhook URL → `https://<your-railway-domain>/api/paystack/webhook`.

### Email — Resend

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | from resend.com → API keys |
| `RESEND_FROM` | `"<School Name> <noreply@yourdomain.com>"` (verified sender) |
| `ADMISSIONS_NOTIFY_EMAIL` | optional override |
| `CONTACT_NOTIFY_EMAIL` | optional override |

### AI chatbot (optional, recommended)

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | from console.anthropic.com |

Without this the chatbot still answers FAQs from `lib/school-faq.ts`; with it, the LLM handles everything.

### WhatsApp Cloud API (optional)

If the school wants the WhatsApp bot live, also set the three vars in `docs/PROJECT_STATUS.md` § 8 ("Needs Mose's action").

### Scheduled backup (optional but strongly recommended)

| Name | Value |
|------|-------|
| `CRON_SECRET` | any 32+ char random string |

Then add a Railway cron service hitting `POST /api/cron/backup` daily with `Authorization: Bearer $CRON_SECRET`.

---

## 3 · First deploy

1. Push to `main` — Railway auto-builds.
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `npx prisma db push --skip-generate --accept-data-loss && npm run start`
4. Wait for healthcheck (`/api/health`) to pass.

---

## 4 · Seed the first super-admin

The DB is empty after `prisma db push`. From the Railway service shell (or locally with the right `DATABASE_URL`):

```bash
npm run db:seed
```

This creates demo users + a super-admin you can log in as. The default password is `SEED_PASSWORD` (set above). **Change it immediately after login.**

---

## 5 · Hand over

Send the school:
1. Their portal URL (`https://<your-railway-domain>` or their custom subdomain)
2. Login for the super-admin account
3. A note to change the password on first login
4. A reminder that real admin / accountant / teacher accounts get created from `/portal/admin/staff` once they're logged in

The super-admin can then:
- Add their own real classes + subjects (`/portal/admin/classes`)
- Bulk-import students via CSV (`/portal/admin/students/import`)
- Create staff accounts (`/portal/admin/staff`) which auto-send welcome emails
- Configure fee structures, sessions, terms

---

## 6 · Custom subdomain (recommended)

In Railway → service → Settings → Domains:
1. Add a custom domain like `portal.theirschool.com`
2. Update `AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to that custom domain
3. Configure DNS at the school's domain registrar: CNAME → Railway's value

After the DNS propagates (5 min – 24 hr), the school accesses their portal at their own subdomain.

---

## Per-customer cost rough estimate

For a single school with ~300 students:

| Item | Cost / month |
|------|--------------|
| Railway (Hobby plan + Postgres) | $5–10 |
| Cloudinary (free tier ample for photos + backups) | $0 |
| Resend (free tier 100 emails/day, then $20/mo) | $0–20 |
| Anthropic (Claude Sonnet, cached prompt) | $1–5 |
| Paystack | 1.5% per transaction (passed through) |
| **Total** | **~$10–35/mo** |

Charge the school N100k–700k per term (see pricing-tier table in our internal notes) and the margin is fine even with hands-on support.
