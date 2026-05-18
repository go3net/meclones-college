import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Megaphone, Send, Trash2, CheckCircle2 } from "lucide-react";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });

const audienceTone: Record<string, "info" | "neutral" | "warning" | "success"> = {
  ALL: "info",
  PARENTS: "success",
  STAFF: "warning",
  STUDENTS: "info",
  CLASS: "neutral",
};

type SearchParams = { created?: string };

export default async function AdminAnnouncementsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const [items, classes] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { publishedAt: "desc" },
      take: 100,
      include: {
        class: { select: { name: true, arm: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.class.findMany({ orderBy: [{ name: "asc" }, { arm: "asc" }] }),
  ]);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Announcements</h1>
          <p className="text-sm text-slate-500">Broadcast updates to parents, staff, students or a single class.</p>
        </div>
      </div>

      {searchParams.created && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Announcement published.
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>New announcement</CardTitle>
            <Megaphone className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardBody>
            <form action={createAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input
                  name="title"
                  required
                  maxLength={150}
                  placeholder="e.g. Mid-term break"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Body *</label>
                <textarea
                  name="body"
                  required
                  rows={5}
                  placeholder="Write the announcement message..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Audience</label>
                <select
                  name="audience"
                  defaultValue="ALL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">Everyone</option>
                  <option value="PARENTS">Parents</option>
                  <option value="STUDENTS">Students</option>
                  <option value="STAFF">Staff</option>
                  <option value="CLASS">Specific class</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Class (only if "Specific class")</label>
                <select name="classId" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="w-full inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold">
                <Send className="h-4 w-4" /> Publish announcement
              </button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Published</CardTitle>
            <Badge tone="neutral">{items.length}</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {items.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No announcements yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map(a => (
                  <li key={a.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-brand-900">{a.title}</p>
                          <Badge tone={audienceTone[a.audience] ?? "neutral"}>{a.audience}{a.class ? ` · ${a.class.name}${a.class.arm}` : ""}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{a.body}</p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {a.author?.name ?? "—"} · {a.publishedAt ? dateFmt.format(a.publishedAt) : "draft"}
                        </p>
                      </div>
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="id" value={a.id} />
                        <button
                          type="submit"
                          className="text-slate-400 hover:text-red-600 p-1"
                          aria-label="Delete announcement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
