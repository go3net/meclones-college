import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Input, Label } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { rotateSession, activateTerm } from "./actions";
import { Calendar, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

type SearchParams = { error?: string; rotated?: string };

function nextSessionGuess(currentName?: string) {
  if (!currentName) return "2026/2027";
  const m = currentName.match(/^(\d{4})\/(\d{4})$/);
  if (!m) return "2026/2027";
  return `${Number(m[1]) + 1}/${Number(m[2]) + 1}`;
}

export default async function SessionsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["DIRECTOR", "SUPER_ADMIN"]);

  const sessions = await prisma.academicSession.findMany({
    orderBy: { createdAt: "desc" },
    include: { terms: { orderBy: { name: "asc" } } },
  });

  const active = sessions.find(s => s.isActive);
  const suggested = nextSessionGuess(active?.name);

  // Sensible defaults: start = today+1day, end = today+10months
  const today = new Date();
  const start = new Date(today.getTime() + 86400_000).toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 305 * 86400_000).toISOString().slice(0, 10);

  return (
    <PortalShell role="director">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Academic Sessions</h1>
        <p className="text-sm text-slate-500">Close the current session and open a new one school-wide. Term-level switching is also handled here.</p>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}
      {searchParams.rotated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> New session "{decodeURIComponent(searchParams.rotated)}" started. Announcement broadcast to school.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active session + term switcher */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current academic year</CardTitle>
            {active && <Badge tone="success">Active · {active.name}</Badge>}
          </CardHeader>
          <CardBody>
            {!active ? (
              <p className="py-8 text-center text-sm text-slate-500">No active session. Start one from the panel on the right.</p>
            ) : (
              <>
                <p className="text-sm text-slate-600 mb-4">
                  Session running from {active.startDate ? dateFmt.format(active.startDate) : "—"} to {active.endDate ? dateFmt.format(active.endDate) : "—"}.
                </p>
                <div className="space-y-2">
                  {active.terms.map(t => {
                    const label = `${t.name.charAt(0)}${t.name.slice(1).toLowerCase()} Term`;
                    return (
                      <div key={t.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${t.isActive ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                        <div>
                          <p className="font-medium text-slate-900">{label}</p>
                          <p className="text-xs text-slate-500">{t.isActive ? "Active term" : "Inactive"}</p>
                        </div>
                        {!t.isActive && (
                          <form action={activateTerm}>
                            <input type="hidden" name="termId" value={t.id} />
                            <Button type="submit" variant="outline" className="text-xs">Activate <ChevronRight className="h-3 w-3" /></Button>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Rotate to a new session */}
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-amber-900">Start a new session</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-slate-500 mb-3">
              This closes the current session and starts a fresh one with three terms. A school-wide announcement will be sent.
            </p>
            <form action={rotateSession} className="space-y-3 text-sm">
              <div><Label>Session name</Label><Input name="newSessionName" defaultValue={suggested} pattern="\d{4}/\d{4}" required /></div>
              <div><Label>Start date</Label><Input name="startDate" type="date" defaultValue={start} required /></div>
              <div><Label>End date</Label><Input name="endDate" type="date" defaultValue={end} required /></div>
              <Button type="submit" variant="gold" className="w-full"><Calendar className="h-4 w-4" /> Open new session</Button>
            </form>
          </CardBody>
        </Card>
      </div>

      {/* History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Session history ({sessions.length})</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Session</th>
                <th className="text-left px-4 py-2.5 font-medium">Start</th>
                <th className="text-left px-4 py-2.5 font-medium">End</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Terms</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 font-medium text-brand-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.startDate ? dateFmt.format(s.startDate) : "—"}</td>
                  <td className="px-4 py-2.5 text-slate-700">{s.endDate ? dateFmt.format(s.endDate) : "—"}</td>
                  <td className="px-4 py-2.5"><Badge tone={s.isActive ? "success" : "neutral"}>{s.isActive ? "Active" : "Closed"}</Badge></td>
                  <td className="px-4 py-2.5 text-slate-700">{s.terms.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
