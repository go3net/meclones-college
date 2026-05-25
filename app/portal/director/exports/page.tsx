import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole, getActiveContext } from "@/lib/auth-helpers";
import {
  ArrowLeft, Download, FileText, Users, GraduationCap, UserCircle2,
  Database, AlertCircle, ScrollText, Cloud, CheckCircle2, XCircle, Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const user = await requireRole(["DIRECTOR", "SUPER_ADMIN", "ADMIN"]);
  const isDirectorPlus = user.role !== "ADMIN";
  const { term, session } = await getActiveContext();

  const [studentCount, teacherCount, parentCount, classCount, lastCronBackup, lastCronFailure] = await Promise.all([
    prisma.student.count({ where: { graduatedAt: null } }),
    prisma.teacher.count(),
    prisma.parent.count(),
    prisma.class.count(),
    prisma.auditLog.findFirst({
      where: { action: "backup.cron_success" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    }),
    prisma.auditLog.findFirst({
      where: { action: "backup.cron_failed" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    }),
  ]);

  const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
  const lastBackupBytes = lastCronBackup?.metadata && typeof lastCronBackup.metadata === "object"
    ? (lastCronBackup.metadata as { bytes?: number }).bytes ?? null
    : null;
  const lastBackupUrl = lastCronBackup?.metadata && typeof lastCronBackup.metadata === "object"
    ? (lastCronBackup.metadata as { url?: string }).url ?? null
    : null;
  const failedAfterLastSuccess = lastCronFailure && lastCronBackup
    ? lastCronFailure.createdAt > lastCronBackup.createdAt
    : Boolean(lastCronFailure && !lastCronBackup);
  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <PortalShell role="director">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/director" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-700 flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Reports &amp; exports
          </p>
          <h1 className="text-2xl font-bold text-brand-900">Bulk exports</h1>
          <p className="text-sm text-slate-500">
            One-click CSV downloads for auditors, class teachers, the PTA — plus a portable JSON snapshot of the whole DB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Students (active)" value={studentCount} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Teachers" value={teacherCount} icon={<GraduationCap className="h-5 w-5" />} accent="sky" />
        <StatCard label="Parents" value={parentCount} icon={<UserCircle2 className="h-5 w-5" />} accent="amber" />
        <StatCard label="Classes" value={classCount} accent="emerald" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ExportCard
          icon={<Users className="h-5 w-5 text-brand-700" />}
          title="Student roll + parent contacts"
          help="Every active student with class, gender, DOB, parents' names, phones, and emails. Useful for class teachers, PTA mail lists, audits."
          href="/api/admin/export/students"
          extraOption={{
            label: "Include graduated alumni",
            href: "/api/admin/export/students?includeGraduated=1",
          }}
          filename={`meclones_students_${new Date().toISOString().slice(0, 10)}.csv`}
        />
        <ExportCard
          icon={<GraduationCap className="h-5 w-5 text-brand-700" />}
          title="Teachers roster"
          help="Every teacher with their subjects, form-class duty, classes they teach in, and contact details."
          href="/api/admin/export/teachers"
          filename={`meclones_teachers_${new Date().toISOString().slice(0, 10)}.csv`}
        />
        <ExportCard
          icon={<UserCircle2 className="h-5 w-5 text-brand-700" />}
          title="Parents directory"
          help="Every parent with their linked children, contact details, and WhatsApp opt-in."
          href="/api/admin/export/parents"
          filename={`meclones_parents_${new Date().toISOString().slice(0, 10)}.csv`}
        />
        <ExportCard
          icon={<CalendarCheck className="h-5 w-5 text-brand-700" />}
          title="Attendance summary (term)"
          help={`Per-student counts (present / absent / late) and rate for the active term${term ? ` (${term.name.toLowerCase()} ${session?.name ?? ""})` : ""}.`}
          href="/api/admin/export/attendance"
          filename={`meclones_attendance_${new Date().toISOString().slice(0, 10)}.csv`}
          disabled={!term}
          disabledReason="No active term"
        />
        <ExportCard
          icon={<ScrollText className="h-5 w-5 text-brand-700" />}
          title="Results — long format (term)"
          help="One row per (student × subject) for the active term. Pivot in Excel for the broadsheet. Defaults to all entries; toggle 'published only' below."
          href="/api/admin/export/results"
          extraOption={{
            label: "Published only",
            href: "/api/admin/export/results?publishedOnly=1",
          }}
          filename={`meclones_results_${new Date().toISOString().slice(0, 10)}.csv`}
          disabled={!term}
          disabledReason="No active term"
        />
        <ExportCard
          icon={<FileText className="h-5 w-5 text-brand-700" />}
          title="Payments ledger"
          help="Every payment (Paystack + manual) across all terms with method, reference, amount, status."
          href="/api/accountant/payments/csv"
          filename={`meclones_payments_${new Date().toISOString().slice(0, 10)}.csv`}
        />
      </div>

      {isDirectorPlus && (
        <Card className="mb-4 border-emerald-200">
          <CardHeader>
            <CardTitle><Cloud className="h-4 w-4 inline mr-1 text-emerald-700" /> Scheduled off-platform backup</CardTitle>
            {lastCronBackup ? (
              <Badge tone={failedAfterLastSuccess ? "warning" : "success"}>
                {failedAfterLastSuccess ? "Last attempt failed" : "Healthy"}
              </Badge>
            ) : (
              <Badge tone="neutral">Not scheduled yet</Badge>
            )}
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            <p className="text-slate-700">
              A cron job can hit <code className="bg-slate-100 px-1 rounded text-xs">/api/cron/backup</code> on a schedule and push the JSON snapshot to Cloudinary, off Railway entirely. Cheap insurance against the worst case.
            </p>

            {lastCronBackup ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                <p className="text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Last successful backup: <strong>{dateTimeFmt.format(lastCronBackup.createdAt)}</strong>
                  {lastBackupBytes && <span className="text-emerald-700">· {formatBytes(lastBackupBytes)}</span>}
                </p>
                {lastBackupUrl && (
                  <p className="text-[11px] text-emerald-700 mt-1 font-mono break-all">{lastBackupUrl}</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-slate-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                No automated backup has run yet. Configure the schedule on Railway (or any cron platform) to start.
              </div>
            )}

            {failedAfterLastSuccess && lastCronFailure && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-800 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Last attempt failed at <strong>{dateTimeFmt.format(lastCronFailure.createdAt)}</strong>. Check server logs.
              </div>
            )}

            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer hover:text-slate-900 font-medium">How to schedule it</summary>
              <ol className="mt-2 list-decimal list-inside space-y-1">
                <li>Set <code className="bg-slate-100 px-1 rounded">CRON_SECRET</code> on Railway (any random 32+ char string).</li>
                <li>Add a cron service in your Railway project that runs daily.</li>
                <li>Command: <code className="bg-slate-100 px-1 rounded">curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://meclones-college-production.up.railway.app/api/cron/backup</code></li>
                <li>Backup files appear in your Cloudinary account under <code className="bg-slate-100 px-1 rounded">meclones/backups/</code>.</li>
              </ol>
            </details>
          </CardBody>
        </Card>
      )}

      {isDirectorPlus ? (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle><Database className="h-4 w-4 inline mr-1 text-amber-700" /> Full database snapshot</CardTitle>
            <Badge tone="warning">Director / Super-admin only</Badge>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-700 mb-3">
              One JSON file containing every row from every domain table. Useful for a portable, restore-from-scratch backup independent of the underlying Postgres binary backups Railway already keeps.
            </p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mb-3">
              <strong>Sensitive.</strong> Contains every parent's phone &amp; email, fee balances, and disciplinary cases. Passwords and 2FA secrets are intentionally omitted. Treat the file like a database — keep it on encrypted storage and shred it when no longer needed.
            </div>
            <a
              href="/api/admin/export/backup"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              <Download className="h-4 w-4" /> Download full backup (.json)
            </a>
            <p className="text-[11px] text-slate-500 mt-2">
              Notifications + audit log are capped at 10,000 most-recent rows so the file stays manageable. For a complete forensic dump, use Railway's pg_dump from the Postgres plugin shell.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="py-6 text-center text-sm text-slate-500">
            <AlertCircle className="h-6 w-6 mx-auto text-slate-300 mb-2" />
            Full database snapshot is for director and super-admin only.
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-slate-500 mt-6">
        Every export is logged in the audit trail (action prefix <code className="bg-slate-100 px-1 rounded">export.*</code>) with the actor and row counts.
      </p>
    </PortalShell>
  );
}

function ExportCard({
  icon,
  title,
  help,
  href,
  filename,
  extraOption,
  disabled,
  disabledReason,
}: {
  icon: React.ReactNode;
  title: string;
  help: string;
  href: string;
  filename: string;
  extraOption?: { label: string; href: string };
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-900">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{help}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">{filename}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {disabled ? (
            <span className="inline-flex items-center gap-2 bg-slate-100 text-slate-500 text-xs font-medium px-3 py-1.5 rounded-lg cursor-not-allowed">
              <Download className="h-3.5 w-3.5" /> {disabledReason ?? "Unavailable"}
            </span>
          ) : (
            <>
              <a
                href={href}
                className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV
              </a>
              {extraOption && (
                <a
                  href={extraOption.href}
                  className="text-xs font-medium text-slate-600 hover:text-brand-700 hover:underline"
                >
                  {extraOption.label} →
                </a>
              )}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
