import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { SCHOOL } from "@/lib/constants";
import { Calendar, Plus, CheckCircle2, MapPin, Phone, Mail, Globe2 } from "lucide-react";
import { setActiveTerm, createSession } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export default async function DirectorSettingsPage() {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const sessions = await prisma.academicSession.findMany({
    orderBy: { name: "desc" },
    include: { terms: { orderBy: { name: "asc" } } },
  });

  return (
    <PortalShell role="director">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-900">School Settings</h1>
        <p className="text-sm text-slate-500">Configure the active academic session and term, and review school details.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>School details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Name</p>
              <p className="font-medium text-slate-900">{SCHOOL.name}</p>
              <p className="text-[12px] text-slate-500">{SCHOOL.tagline}</p>
            </div>
            <div className="flex gap-3">
              <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
              <span className="text-slate-700">{SCHOOL.address}</span>
            </div>
            <div className="flex gap-3 items-center">
              <Phone className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-slate-700">{SCHOOL.phone}</span>
            </div>
            <div className="flex gap-3 items-center">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-slate-700">{SCHOOL.email}</span>
            </div>
            <div className="flex gap-3 items-center">
              <Globe2 className="h-4 w-4 text-slate-400 shrink-0" />
              <a href={SCHOOL.website} className="text-brand-700 hover:underline">{SCHOOL.website.replace(/^https?:\/\//, "")}</a>
            </div>
            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              Stored in <code className="bg-slate-100 px-1 rounded">lib/constants.ts</code>. Edit and redeploy to change.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New academic session</CardTitle>
            <Plus className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody>
            <form action={createSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Session name</label>
                <input
                  name="name"
                  required
                  pattern="\d{4}/\d{4}"
                  placeholder="2027/2028"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="text-[11px] text-slate-500 mt-1">Format YYYY/YYYY. The 3 terms (FIRST/SECOND/THIRD) are created automatically.</p>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <Plus className="h-4 w-4" /> Create session
              </button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions & terms</CardTitle>
          <Calendar className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody className="p-0">
          {sessions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No sessions yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map(s => (
                <li key={s.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-brand-900">{s.name}</p>
                        {s.isActive && <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Active</Badge>}
                      </div>
                      <p className="text-[12px] text-slate-500 mt-0.5">
                        {s.startDate ? `Starts ${dateFmt.format(s.startDate)}` : "Start date not set"}
                        {s.endDate ? ` · ends ${dateFmt.format(s.endDate)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {s.terms.map(t => (
                      <form key={t.id} action={setActiveTerm}>
                        <input type="hidden" name="termId" value={t.id} />
                        <button
                          type="submit"
                          disabled={t.isActive}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${t.isActive ? "border-emerald-300 bg-emerald-50 cursor-default" : "border-slate-200 hover:border-brand-300 hover:bg-brand-50"}`}
                          title={t.isActive ? "Currently active" : "Click to activate this term"}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{t.name.charAt(0)}{t.name.slice(1).toLowerCase()}</span>
                            {t.isActive && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          </div>
                          <span className="text-[11px] text-slate-500">{t.isActive ? "Active" : "Activate"}</span>
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  );
}
