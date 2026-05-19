import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { nominateAward, deleteAward } from "./actions";
import { Award as AwardIcon, Star, Trash2, CheckCircle2, AlertCircle, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const CATEGORY_LABEL: Record<string, string> = {
  ACADEMIC_EXCELLENCE: "Academic Excellence",
  ATTENDANCE: "Attendance",
  CONDUCT: "Conduct",
  LEADERSHIP: "Leadership",
  SPORTSMANSHIP: "Sportsmanship",
  COMMUNITY_SERVICE: "Community Service",
  ARTS: "Arts",
  IMPROVEMENT: "Most Improved",
  PERFECT_ATTENDANCE: "Perfect Attendance",
  OTHER: "Other",
};

const CATEGORY_TONE: Record<string, "success" | "info" | "warning" | "gold" | "neutral"> = {
  ACADEMIC_EXCELLENCE: "gold",
  ATTENDANCE: "success",
  CONDUCT: "info",
  LEADERSHIP: "gold",
  SPORTSMANSHIP: "success",
  COMMUNITY_SERVICE: "info",
  ARTS: "warning",
  IMPROVEMENT: "success",
  PERFECT_ATTENDANCE: "gold",
  OTHER: "neutral",
};

type SearchParams = { created?: string; error?: string };

export default async function AwardsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN", "TEACHER"]);

  const [awards, students, byCategory] = await Promise.all([
    prisma.award.findMany({
      orderBy: { awardedAt: "desc" },
      include: {
        student: { include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } } },
        awardedBy: { select: { name: true } },
        term: { select: { name: true } },
        session: { select: { name: true } },
      },
      take: 200,
    }),
    prisma.student.findMany({
      include: { user: { select: { name: true } }, classRef: { select: { name: true, arm: true } } },
      orderBy: { admissionNumber: "asc" },
    }),
    prisma.award.groupBy({ by: ["category"], _count: { category: true } }),
  ]);

  const totalByCategory = byCategory.reduce((acc, r) => { acc[r.category] = r._count.category; return acc; }, {} as Record<string, number>);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Awards & Recognition</h1>
        <p className="text-sm text-slate-500">Nominate students for awards based on academic performance, conduct, attendance, leadership and more. Awards appear on result slips.</p>
      </div>

      {searchParams.created && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Award added.</div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total awards" value={awards.length} icon={<AwardIcon className="h-5 w-5" />} accent="gold" />
        <StatCard label="Academic" value={totalByCategory.ACADEMIC_EXCELLENCE ?? 0} accent="emerald" />
        <StatCard label="Leadership" value={totalByCategory.LEADERSHIP ?? 0} accent="brand" />
        <StatCard label="Sports" value={totalByCategory.SPORTSMANSHIP ?? 0} accent="sky" />
        <StatCard label="Attendance" value={(totalByCategory.ATTENDANCE ?? 0) + (totalByCategory.PERFECT_ATTENDANCE ?? 0)} accent="amber" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle><Trophy className="h-4 w-4 inline mr-1" /> Nominate a student</CardTitle></CardHeader>
          <CardBody>
            <form action={nominateAward} className="space-y-3 text-sm">
              <div>
                <Label>Student *</Label>
                <Select name="studentId" required defaultValue="">
                  <option value="" disabled>Choose…</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.user.name} {s.classRef ? `(${s.classRef.name}${s.classRef.arm})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select name="category" required defaultValue="ACADEMIC_EXCELLENCE">
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <div><Label>Title *</Label><Input name="title" required placeholder="e.g. Best Maths Student" /></div>
              <div>
                <Label>Stars (1–5)</Label>
                <Select name="stars" defaultValue="5">
                  {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{"★".repeat(n)}{"☆".repeat(5 - n)}</option>)}
                </Select>
              </div>
              <div><Label>Citation</Label><Textarea name="citation" rows={2} placeholder="Why this award? Shown on the result slip." /></div>
              <Button type="submit" variant="gold" className="w-full"><AwardIcon className="h-4 w-4" /> Award student</Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent awards ({awards.length})</CardTitle></CardHeader>
          <CardBody className="p-0">
            {awards.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No awards yet — nominate the first one!</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                {awards.map(a => (
                  <div key={a.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/portal/admin/students/${a.studentId}`} className="font-semibold text-brand-900 hover:underline">
                            {a.student.user.name}
                          </Link>
                          {a.student.classRef && <Badge tone="neutral">{a.student.classRef.name}{a.student.classRef.arm}</Badge>}
                          <Badge tone={CATEGORY_TONE[a.category]}>{CATEGORY_LABEL[a.category]}</Badge>
                          <span className="text-gold-500 text-xs">{"★".repeat(a.stars)}{"☆".repeat(5 - a.stars)}</span>
                        </div>
                        <p className="font-medium text-slate-900 mt-1">{a.title}</p>
                        {a.citation && <p className="text-xs text-slate-600 italic mt-0.5">"{a.citation}"</p>}
                        <p className="text-[11px] text-slate-500 mt-1">
                          {dateFmt.format(a.awardedAt)}
                          {a.term && a.session && ` · ${a.term.name.charAt(0)}${a.term.name.slice(1).toLowerCase()} ${a.session.name}`}
                          {a.awardedBy && ` · by ${a.awardedBy.name}`}
                        </p>
                      </div>
                      <form action={deleteAward}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="outline" className="text-xs text-rose-700 hover:bg-rose-50"><Trash2 className="h-3 w-3" /></Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
