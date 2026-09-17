/**
 * Tenant-isolation smoke test for the Prisma extension.
 *
 * Creates two throwaway schools, writes a user + student in each through
 * the scoped client, and asserts that neither can see the other's rows,
 * that nested creates are stamped, and that a query with no context is
 * rejected in strict mode. Cleans up after itself, including on failure.
 *
 *   TENANT_ENFORCEMENT=strict npx tsx scripts/tenant-smoke.ts
 *
 * Needs DATABASE_URL. Safe to run against a live database: everything it
 * creates carries a `zz-smoke-` slug / email and is deleted at the end.
 */

import { prisma, prismaBase } from "../lib/prisma";
import { runAsSchool, runWithoutTenant } from "../lib/tenant-context";
import { TenantContextError } from "../lib/prisma-tenant-extension";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error("ASSERT: " + msg);
}

const stamp = Date.now().toString(36);
const slugA = `zz-smoke-a-${stamp}`;
const slugB = `zz-smoke-b-${stamp}`;

async function cleanup() {
  const schools = await prismaBase.school.findMany({ where: { slug: { in: [slugA, slugB] } } });
  for (const s of schools) {
    // Student rows cascade from User; Parent likewise.
    await prismaBase.user.deleteMany({ where: { schoolId: s.id } });
    await prismaBase.auditLog.deleteMany({ where: { schoolId: s.id } });
    await prismaBase.school.delete({ where: { id: s.id } });
  }
}

async function main() {
  process.env.TENANT_ENFORCEMENT = process.env.TENANT_ENFORCEMENT ?? "strict";

  const A = await prismaBase.school.create({ data: { slug: slugA, code: `ZA${stamp.slice(-3).toUpperCase()}`, name: "Smoke A", shortName: "Smoke A" } });
  const B = await prismaBase.school.create({ data: { slug: slugB, code: `ZB${stamp.slice(-3).toUpperCase()}`, name: "Smoke B", shortName: "Smoke B" } });

  // Nested create: student -> user, both must be stamped with A.
  const studentA = await runAsSchool(A, () =>
    prisma.student.create({
      data: {
        admissionNumber: `${A.code}/SMOKE/${stamp}/001`,
        user: { create: { name: "Smoke Student A", email: `zz-smoke-a-${stamp}@example.invalid`, passwordHash: "x", role: "STUDENT" } },
      },
      include: { user: true },
    }),
  );
  assert(studentA.schoolId === A.id, "student A stamped");
  assert(studentA.user.schoolId === A.id, "nested user A stamped");

  // Caller-supplied schoolId must be overridden, never trusted.
  const userB = await runAsSchool(B, () =>
    prisma.user.create({
      data: { name: "Smoke User B", email: `zz-smoke-b-${stamp}@example.invalid`, passwordHash: "x", role: "TEACHER", schoolId: A.id },
    }),
  );
  assert(userB.schoolId === B.id, "caller schoolId overridden on create");

  // Reads are isolated.
  const countA = await runAsSchool(A, () => prisma.user.count());
  const countB = await runAsSchool(B, () => prisma.user.count());
  assert(countA === 1, `A sees 1 user, saw ${countA}`);
  assert(countB === 1, `B sees 1 user, saw ${countB}`);

  const crossRead = await runAsSchool(B, () => prisma.student.findUnique({ where: { id: studentA.id } }));
  assert(crossRead === null, "B cannot read A's student by id");

  const crossUpdate = await runAsSchool(B, () =>
    prisma.user.updateMany({ where: { id: studentA.userId }, data: { name: "hijacked" } }),
  );
  assert(crossUpdate.count === 0, "B cannot update A's user");

  // Update data cannot re-home a row.
  const moved = await runAsSchool(A, () =>
    prisma.user.update({ where: { id: studentA.userId }, data: { name: "Renamed", schoolId: B.id } as never }),
  );
  assert(moved.schoolId === A.id, "update cannot change schoolId");

  // No context: strict mode rejects tenant-model queries.
  if (process.env.TENANT_ENFORCEMENT === "strict") {
    let threw = false;
    try {
      await runWithoutTenant(() => prisma.user.count());
    } catch (err) {
      threw = err instanceof TenantContextError;
    }
    assert(threw, "strict mode throws TenantContextError without context");
  }

  // Non-tenant model is untouched.
  const schools = await runWithoutTenant(() => prisma.school.count({ where: { slug: { in: [slugA, slugB] } } }));
  assert(schools === 2, "School model is not scoped");

  console.log("tenant smoke: ALL PASSED");
}

main()
  .catch(err => {
    console.error("tenant smoke: FAILED", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(err => console.error("cleanup failed", err));
    await prismaBase.$disconnect();
  });
