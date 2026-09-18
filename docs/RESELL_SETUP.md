# Onboard a new school on SchoolBot

SchoolBot is one deployment, one database, many schools. You no longer
fork the repo or set per-school env vars: a platform admin creates the
school from the portal and the platform does the rest. This is the
checklist.

---

## 0 · What you'll need from the school

- Legal school name + a short version (e.g. "Greensprings School Lekki" / "Greensprings")
- A slug for their subdomain (`greensprings` → `greensprings.schoolbot.com.ng`)
- A 2–4 character code for admission numbers (e.g. `GSL` → `GSL/JSS1A/2526/001`)
- Tagline, full address + short address, office hours
- Local phone, international (E.164) phone, WhatsApp number
- General email + admissions email
- Their existing website URL and/or the custom domain they want to use
- Whether they want a public website from us or only the portal
- The name, email and a temporary password for their first super-admin

For WhatsApp: the **phone number id** of their number in your Meta
Business app (Meta Business → WhatsApp → API setup). Add the school's
number to your WhatsApp Business Account first.

For payments: their **Paystack subaccount code** (`ACCT_…`) so fees settle
into their bank through the platform's Paystack account, or their own
Paystack secret/public keys if they insist on their own account.

---

## 1 · Create the school (5 minutes)

1. Sign in as a platform admin at `https://schoolbot.com.ng/portal/login`.
2. Go to **Schools → Add a school**, fill in the identity fields and the
   first super-admin account, submit.
3. This creates, in one go: the `School` row (status TRIAL), the
   super-admin user, a Main branch, an empty brand row and the default
   chatbot knowledge sections, all isolated to that school.
4. Open the school's page and, under **WhatsApp & Paystack**, paste the
   Meta phone number id and (if any) the Paystack subaccount code. Secrets
   are encrypted at rest with `APP_ENCRYPTION_KEY`.

The school is now live at `https://<slug>.schoolbot.com.ng` (needs the
wildcard DNS below) and its super-admin can sign in at
`/portal/login` there with the temporary password.

---

## 2 · Platform DNS and domains (one-time, then per custom domain)

- **Wildcard subdomain (one-time):** in Cloudflare add `*.schoolbot.com.ng`
  CNAME → the Railway domain, and add `*.schoolbot.com.ng` as a custom
  domain on the Railway service. Every new slug works immediately after.
- **Custom domain (per school):** set it on the school's page
  (`customDomain`), have the school CNAME the domain to Railway, and add
  the domain on the Railway service. The host resolver maps it to the
  school as soon as Railway serves it.

Hosts that match nothing (the Railway URL, localhost) serve the default
school (`DEFAULT_SCHOOL_SLUG`, currently `meclones`).

---

## 3 · WhatsApp (per school)

One Meta app, one webhook URL, many numbers. The webhook is already set
to `https://<railway-domain>/api/whatsapp/meta` with the app-level
`WHATSAPP_VERIFY_TOKEN`. For each new school:

1. Add their number to the WhatsApp Business Account in Meta.
2. Paste its phone number id on the school's platform page.
3. Inbound messages to that number now run in that school's context;
   replies go out from that number using the business-level
   `WHATSAPP_ACCESS_TOKEN` (or a per-number token if you stored one).

---

## 3b · Schools that already have a website: the widget

They keep their site and add one line before `</body>` on every page:

```html
<script src="https://schoolbot.com.ng/embed/v1.js" data-key="sb_…" async></script>
```

- The director finds the exact snippet, a preview link and the settings
  at `/portal/director/website-widget` (platform admins see the same
  snippet on the school's page). The key only identifies the school.
- Default mode shows a "Chat with us" button that opens the AI assistant
  (answers from the school's Chatbot KB) with a WhatsApp handoff.
  `data-mode="whatsapp"` gives a WhatsApp-only button; `data-position="left"`
  and `data-color="#hex"` adjust placement and colour.
- Settings: enable/disable, and an allowed-websites list. Empty = any
  site can load it; once filled, only those origins (and subdomains) can
  load the widget or use the assistant. "Issue a new key" invalidates
  the old snippet.
- `/embed/preview` on the school's host renders the widget on a blank
  page for testing.
- Endpoints behind it: `GET /api/embed/config?key=` and
  `POST /api/embed/chat?key=` (CORS, per-school + IP rate limit).
  They resolve the school from the key, never from the host.

---

## 4 · Hand over

Send the school:

1. Their portal URL (`https://<slug>.schoolbot.com.ng` or their custom domain)
2. The super-admin login and a note to change the password on first login
3. A reminder that admin / accountant / teacher accounts get created from
   `/portal/admin/staff` once they're logged in

The super-admin can then add classes and subjects, bulk-import students
by CSV (`/portal/admin/students/import`), create staff accounts, and set
up fee structures, sessions and terms. Their director edits branding at
`/portal/director/branding` and the chatbot knowledge at
`/portal/admin/knowledge`.

Flip the school's status from TRIAL to ACTIVE on its platform page once
they're paying; SUSPENDED is a soft switch-off and is required before a
school can be deleted.

---

## 5 · Platform environment variables (Railway, once)

| Name | Purpose |
|------|---------|
| `PLATFORM_ROOT_DOMAIN` | `schoolbot.com.ng` — bare host = sales site, `{slug}.<root>` = a school |
| `DEFAULT_SCHOOL_SLUG` | school served on unmatched hosts (Railway URL, localhost) |
| `APP_ENCRYPTION_KEY` | 32 random bytes base64; encrypts per-school WhatsApp / Paystack secrets |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` | creates the platform operator account on boot if missing |
| `TENANT_ENFORCEMENT` | `warn` (log unscoped queries) or `strict` (reject them) |
| `PLATFORM_PHONE`, `PLATFORM_PHONE_INTL`, `PLATFORM_EMAIL`, `PLATFORM_WHATSAPP` | SchoolBot's own contact details shown on the sales site |
| `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Meta app-level verify token, business token, and the default school's number |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | platform Paystack account (schools split via subaccounts) |
| `RESEND_API_KEY`, `RESEND_FROM` | one verified sender; each school gets its own display name and reply-to |
| `CLOUDINARY_*`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, `AUTH_SECRET`, `DATABASE_URL` | unchanged from before |

The old `SCHOOL_*` variables are only read once, by the boot backfill,
to create the first (Meclones) school row. They can be left in place.

---

## 6 · Checking tenancy health

`GET /api/health/host` on any host reports which school that host
resolves to, how many schools exist, the enforcement mode and a count of
any queries that ran without a school context (`unscopedQueries`,
should stay `{}`). Add `?orphans=1` to count rows with no `schoolId`
(should be `{}` after the boot backfill).

---

## Cost per school

Marginal cost of an extra school on the shared deployment is close to
zero until database size or traffic forces a bigger Railway plan.
Per-transaction Paystack fees are passed through. Pricing tiers are in
`docs/PROJECT_STATUS.md` § 11.
