import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Input, Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getSessionUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import {
  Search, Users, GraduationCap, UserCircle2, ClipboardList, BookMarked, Shield, Receipt, ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SHELL_ROLE: Record<string, "director" | "school_admin" | "accountant" | "teacher" | "parent" | "student"> = {
  SUPER_ADMIN: "director",
  DIRECTOR: "director",
  ADMIN: "school_admin",
  ACCOUNTANT: "accountant",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};

const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const PAGE_LIMIT = 10;

type SearchParams = { q?: string };

export default async function GlobalSearchPage({ searchParams }: { searchParams: SearchParams }) {
  // Search is for staff only. Parents/students get bounced back to their home.
  await requireRole(["SUPER_ADMIN", "DIRECTOR", "ADMIN", "ACCOUNTANT", "TEACHER"]);
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  const q = (searchParams.q ?? "").trim();
  const role = user.role;
  const isStaff = ["SUPER_ADMIN", "DIRECTOR", "ADMIN", "ACCOUNTANT"].includes(role);
  const isAccountant = role === "ACCOUNTANT";

  // For TEACHER, scope student/discipline searches to their own classes.
  let teacherClassIds: string[] = [];
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.id },
      include: { classTeacherOf: { select: { id: true } }, classes: { select: { classId: true } } },
    });
    teacherClassIds = Array.from(new Set<string>([
      ...(teacher?.classTeacherOf.map(c => c.id) ?? []),
      ...(teacher?.classes.map(c => c.classId) ?? []),
    ]));
  }

  if (!q || q.length < 2) {
    return (
      <PortalShell role={SHELL_ROLE[role]}>
        <SearchHeader q={q} />
        <Card>
          <CardBody className="py-12 text-center">
            <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">Start typing to search</p>
            <p className="text-sm text-slate-500 mt-1">
              Students, teachers, parents, classes, subjects{isStaff && ", payments, disciplinary cases"} — all at once.
            </p>
          </CardBody>
        </Card>
      </PortalShell>
    );
  }

  // ─── Build queries ──────────────────────────────────────────────────
  const insensitive = { contains: q, mode: "insensitive" as const };

  const studentsWhere: Record<string, unknown> = {
    OR: [
      { user: { name: insensitive } },
      { admissionNumber: insensitive },
    ],
  };
  if (role === "TEACHER") {
    studentsWhere.classId = teacherClassIds.length > 0 ? { in: teacherClassIds } : "__never__";
  }

  const subjectsWhere = {
    OR: [{ name: insensitive }, { code: insensitive }],
  };

  // Class search: name+arm concatenated. Prisma can't do that directly so we
  // pull a broad set and post-filter (school has few classes so this is fine).
  const allClasses = await prisma.class.findMany({
    select: { id: true, name: true, arm: true, level: true, classTeacher: { select: { user: { select: { name: true } } } } },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });
  const ql = q.toLowerCase();
  const classes = allClasses.filter(c =>
    `${c.name}${c.arm}`.toLowerCase().includes(ql) ||
    c.name.toLowerCase().includes(ql) ||
    c.arm.toLowerCase().includes(ql) ||
    c.classTeacher?.user.name.toLowerCase().includes(ql),
  ).slice(0, PAGE_LIMIT);

  // Disciplinary cases — staff see all, teachers see their classes.
  const disciplinaryWhere: Record<string, unknown> = {
    OR: [
      { description: insensitive },
      { student: { user: { name: insensitive } } },
      { student: { admissionNumber: insensitive } },
    ],
  };
  if (role === "TEACHER") {
    disciplinaryWhere.student = teacherClassIds.length > 0
      ? { classId: { in: teacherClassIds } }
      : { id: "__never__" };
  }

  const [students, teachers, parents, subjects, discipline, payments] = await Promise.all([
    prisma.student.findMany({
      where: studentsWhere,
      include: {
        user: { select: { name: true, email: true, image: true } },
        classRef: { select: { name: true, arm: true } },
      },
      orderBy: { user: { name: "asc" } },
      take: PAGE_LIMIT,
    }),
    isStaff
      ? prisma.teacher.findMany({
          where: {
            OR: [
              { user: { name: insensitive } },
              { user: { email: insensitive } },
              { subjects: { some: { subject: { OR: [{ name: insensitive }, { code: insensitive }] } } } },
            ],
          },
          include: {
            user: { select: { name: true, email: true, phone: true, image: true } },
            subjects: { include: { subject: { select: { code: true } } } },
          },
          orderBy: { user: { name: "asc" } },
          take: PAGE_LIMIT,
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.parent.findMany({
          where: {
            OR: [
              { user: { name: insensitive } },
              { user: { email: insensitive } },
              { user: { phone: insensitive } },
            ],
          },
          include: {
            user: { select: { name: true, email: true, phone: true } },
            children: { include: { student: { include: { user: { select: { name: true } } } } } },
          },
          orderBy: { user: { name: "asc" } },
          take: PAGE_LIMIT,
        })
      : Promise.resolve([]),
    isStaff
      ? prisma.subject.findMany({
          where: subjectsWhere,
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
          take: PAGE_LIMIT,
        })
      : Promise.resolve([]),
    prisma.disciplinaryCase.findMany({
      where: disciplinaryWhere,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            classRef: { select: { name: true, arm: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_LIMIT,
    }),
    isStaff
      ? prisma.payment.findMany({
          where: {
            OR: [
              { reference: insensitive },
              { fee: { student: { user: { name: insensitive } } } },
              { fee: { student: { admissionNumber: insensitive } } },
            ],
          },
          include: {
            fee: {
              include: {
                student: {
                  include: {
                    user: { select: { name: true } },
                    classRef: { select: { name: true, arm: true } },
                  },
                },
              },
            },
          },
          orderBy: { paidAt: "desc" },
          take: PAGE_LIMIT,
        })
      : Promise.resolve([]),
  ]);

  const totalHits = students.length + teachers.length + parents.length + classes.length + subjects.length + discipline.length + payments.length;

  return (
    <PortalShell role={SHELL_ROLE[role]}>
      <SearchHeader q={q} />

      {totalHits === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No matches for "{q}"</p>
            <p className="text-sm text-slate-500 mt-1">Try a shorter phrase, or check the spelling.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-slate-500">
            <strong className="text-slate-900">{totalHits}</strong> match{totalHits === 1 ? "" : "es"} for "{q}".
          </p>

          {/* Students */}
          {students.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Users className="h-4 w-4 inline mr-1 text-brand-700" /> Students</CardTitle>
                <Badge tone="neutral">{students.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {students.map(s => {
                    const photo = s.photoUrl ?? s.user.image ?? null;
                    const initials = s.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                    const href = role === "TEACHER"
                      ? `/portal/teacher/students/${s.id}`
                      : `/portal/admin/students/${s.id}`;
                    return (
                      <Link key={s.id} href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {photo ? <img src={photo} alt={s.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-900 truncate">{s.user.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {s.admissionNumber}
                            {s.classRef && <> · {s.classRef.name}{s.classRef.arm}</>}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Teachers */}
          {teachers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><GraduationCap className="h-4 w-4 inline mr-1 text-brand-700" /> Teachers</CardTitle>
                <Badge tone="neutral">{teachers.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {teachers.map(t => {
                    const initials = t.user.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <Link key={t.id} href={`/portal/admin/teachers/${t.id}/edit`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                        <div className="relative h-9 w-9 rounded-full overflow-hidden bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {t.user.image ? <img src={t.user.image} alt={t.user.name} className="absolute inset-0 h-full w-full object-cover" /> : initials || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-900 truncate">{t.user.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {t.user.email}
                            {t.subjects.length > 0 && (
                              <> · {t.subjects.map(s => s.subject.code).slice(0, 4).join(", ")}{t.subjects.length > 4 && " …"}</>
                            )}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Parents */}
          {parents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><UserCircle2 className="h-4 w-4 inline mr-1 text-brand-700" /> Parents</CardTitle>
                <Badge tone="neutral">{parents.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {parents.map(p => (
                    <Link key={p.id} href={`/portal/admin/parents/${p.id}/edit`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <UserCircle2 className="h-9 w-9 text-amber-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-900 truncate">{p.user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.user.email}
                          {p.user.phone && ` · ${p.user.phone}`}
                          {p.children.length > 0 && (
                            <> · {p.children.length} child{p.children.length === 1 ? "" : "ren"}: {p.children.slice(0, 3).map(c => c.student.user.name.split(" ")[0]).join(", ")}{p.children.length > 3 && " …"}</>
                          )}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Classes */}
          {classes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><ClipboardList className="h-4 w-4 inline mr-1 text-brand-700" /> Classes</CardTitle>
                <Badge tone="neutral">{classes.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {classes.map(c => (
                    <Link
                      key={c.id}
                      href={isStaff ? `/portal/admin/classes` : `/portal/teacher/classes/${c.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <ClipboardList className="h-9 w-9 text-brand-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-900">{c.name}{c.arm}</p>
                        <p className="text-[11px] text-slate-500">
                          {c.level}
                          {c.classTeacher && <> · form teacher: {c.classTeacher.user.name}</>}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Subjects */}
          {subjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><BookMarked className="h-4 w-4 inline mr-1 text-brand-700" /> Subjects</CardTitle>
                <Badge tone="neutral">{subjects.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {subjects.map(s => (
                    <Link key={s.id} href="/portal/admin/subjects" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <BookMarked className="h-7 w-7 text-sky-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-900">{s.name} <span className="text-xs text-slate-500 font-mono">({s.code})</span></p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Disciplinary cases */}
          {discipline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Shield className="h-4 w-4 inline mr-1 text-rose-600" /> Disciplinary cases</CardTitle>
                <Badge tone="neutral">{discipline.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {discipline.map(c => {
                    const href = role === "TEACHER"
                      ? `/portal/teacher/discipline/${c.id}`
                      : `/portal/admin/discipline/${c.id}`;
                    return (
                      <Link key={c.id} href={href} className="block px-4 py-2.5 hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-brand-900">{c.student.user.name}</p>
                          <span className="text-[10px] text-slate-500">{dateFmt.format(c.incidentDate)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{c.category.replace(/_/g, " ").toLowerCase()} · {c.severity.toLowerCase()} · {c.description.slice(0, 100)}</p>
                      </Link>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle><Receipt className="h-4 w-4 inline mr-1 text-emerald-700" /> Payments</CardTitle>
                <Badge tone="neutral">{payments.length}</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                  {payments.map(p => (
                    <Link
                      key={p.id}
                      href={isAccountant || isStaff ? `/portal/parent/fees/receipt/${p.id}` : "#"}
                      className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-brand-900 truncate">{p.fee.student.user.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {p.fee.feeType} · {p.method.toLowerCase()} · {p.reference}
                          {p.paidAt && <> · {dateFmt.format(p.paidAt)}</>}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-emerald-700 shrink-0">{nairaFmt.format(Number(p.amount))}</p>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function SearchHeader({ q }: { q: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <Search className="h-5 w-5 text-brand-700" />
        <h1 className="text-2xl font-bold text-brand-900">Search</h1>
      </div>
      <form method="GET" action="/portal/search" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search students, teachers, parents, classes, payments, references…"
          className="flex-1"
          autoFocus
        />
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}
