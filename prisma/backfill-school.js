/**
 * Boot-time tenancy backfill.
 *
 * Runs from the Railway start command (see railway.json) right after
 * `prisma db push` and before `next start`. Plain CommonJS on purpose:
 * it must work with nothing but @prisma/client and bcryptjs installed,
 * so a missing dev tool can never block a production boot.
 *
 * What it does, idempotently:
 *   1. If no School row exists, create the default one from the SCHOOL_*
 *      env vars (the Meclones deployment's original identity).
 *   2. If there is exactly ONE school, adopt every row whose schoolId is
 *      still NULL into it. With two or more schools we can no longer
 *      guess an owner, so orphans are only reported.
 *   3. If PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD are set and no
 *      user has that email, create the platform operator account.
 *
 * Never overwrites an existing School and never exits non-zero: a failed
 * backfill must not take the site down, it just logs loudly.
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const env = (name, fallback = "") => (process.env[name] ?? fallback).trim();
const flag = (name, fallback) =>
  !["false", "0", "off", "no"].includes(env(name, fallback).toLowerCase());

/**
 * Identity of the deployment's original school. These env vars used to
 * drive lib/constants.ts; they now only seed the first School row.
 */
const DEFAULT_SCHOOL = {
  slug:              env("DEFAULT_SCHOOL_SLUG", "meclones"),
  code:              env("SCHOOL_CODE", "MCL"),
  name:              env("SCHOOL_NAME", "Meclones College Lekki"),
  shortName:         env("SCHOOL_SHORT_NAME", "Meclones College"),
  tagline:           env("SCHOOL_TAGLINE", "Character. Excellence. Leadership."),
  address:           env("SCHOOL_ADDRESS", "Plot 19 Road 15, Lekki Atlantic Gardens, Alabeko, Eti Osa, Lagos"),
  addressShort:      env("SCHOOL_ADDRESS_SHORT", "Plot 19 Road 15, Lekki Atlantic Gardens, Lagos"),
  phone:             env("SCHOOL_PHONE", "0806 024 6634"),
  phoneIntl:         env("SCHOOL_PHONE_INTL", "+2348060246634"),
  email:             env("SCHOOL_EMAIL", "info@meclonescollege.com"),
  admissionsEmail:   env("SCHOOL_ADMISSIONS_EMAIL", "admissions@meclonescollege.com"),
  whatsapp:          env("SCHOOL_WHATSAPP", "2348060246634"),
  hours:             env("SCHOOL_HOURS", "Mon – Fri, 8:00am – 4:00pm"),
  website:           env("SCHOOL_WEBSITE", "https://meclonescollege.com"),
  socials: {
    facebook:  env("SCHOOL_FACEBOOK", "https://facebook.com/meclonescollege"),
    instagram: env("SCHOOL_INSTAGRAM", "https://instagram.com/meclonescollege"),
    twitter:   env("SCHOOL_TWITTER", "https://twitter.com/meclonescollege"),
    youtube:   env("SCHOOL_YOUTUBE", "https://youtube.com/@meclonescollege"),
    linkedin:  env("SCHOOL_LINKEDIN", "https://linkedin.com/company/meclonescollege"),
  },
  stats: {
    alumni:          Number(env("SCHOOL_STATS_ALUMNI", "365")),
    teachers:        Number(env("SCHOOL_STATS_TEACHERS", "45")),
    yearsExperience: Number(env("SCHOOL_STATS_YEARS", "20")),
  },
  customDomain:      env("DEFAULT_SCHOOL_DOMAIN", "meclonescollege.com") || null,
  publicSiteEnabled: flag("ENABLE_PUBLIC_SITE", "true"),
  whatsappPhoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID") || null,
  status: "ACTIVE",
};

/** Every model that carries the tenant column, straight from the schema. */
const TENANT_MODELS = Prisma.dmmf.datamodel.models
  .filter(m => m.fields.some(f => f.name === "schoolId"))
  .map(m => m.name);

function delegate(modelName) {
  return prisma[modelName[0].toLowerCase() + modelName.slice(1)];
}

async function ensureDefaultSchool() {
  const count = await prisma.school.count();
  if (count > 0) {
    return { school: await prisma.school.findFirst({ orderBy: { createdAt: "asc" } }), count };
  }
  const school = await prisma.school.create({ data: DEFAULT_SCHOOL });
  console.log(`[backfill] created default school "${school.name}" (slug=${school.slug}, id=${school.id})`);
  return { school, count: 1 };
}

async function adoptOrphans(school) {
  let adopted = 0;
  for (const model of TENANT_MODELS) {
    const res = await delegate(model).updateMany({
      where: { schoolId: null },
      data: { schoolId: school.id },
    });
    if (res.count > 0) {
      adopted += res.count;
      console.log(`[backfill] ${model}: adopted ${res.count} row(s) into ${school.slug}`);
    }
  }
  if (adopted === 0) console.log("[backfill] no orphan rows");
}

async function reportOrphans() {
  for (const model of TENANT_MODELS) {
    const n = await delegate(model).count({ where: { schoolId: null } });
    if (n > 0) console.warn(`[backfill] WARNING ${model}: ${n} row(s) have no schoolId and >1 school exists; fix by hand`);
  }
}

async function ensurePlatformAdmin() {
  const email = env("PLATFORM_ADMIN_EMAIL").toLowerCase();
  const password = env("PLATFORM_ADMIN_PASSWORD");
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (existing) {
    if (existing.role !== "PLATFORM_ADMIN") {
      console.warn(`[backfill] ${email} exists with role ${existing.role}; not promoting automatically`);
    }
    return;
  }
  await prisma.user.create({
    data: {
      name: env("PLATFORM_ADMIN_NAME", "SchoolBot Admin"),
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "PLATFORM_ADMIN",
      isActive: true,
      schoolId: null,
    },
  });
  console.log(`[backfill] created platform admin ${email}`);
}

async function main() {
  console.log(`[backfill] tenant models: ${TENANT_MODELS.length}`);
  const { school, count } = await ensureDefaultSchool();
  if (count === 1 && school) {
    await adoptOrphans(school);
  } else {
    console.log(`[backfill] ${count} schools present; skipping automatic adoption`);
    await reportOrphans();
  }
  await ensurePlatformAdmin();
}

main()
  .catch(err => {
    // Loud but non-fatal: the app runs in warn mode and must still boot.
    console.error("[backfill] FAILED", err);
  })
  .finally(() => prisma.$disconnect());
