import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { setPermission } from "./actions";
import { ShieldCheck, ShieldOff } from "lucide-react";

export const dynamic = "force-dynamic";

const PERMISSION_LIST: { key: string; label: string; description: string }[] = [
  { key: "canManageStudents", label: "Students", description: "Add, edit, delete students" },
  { key: "canManageTeachers", label: "Teachers", description: "Add, edit, delete teachers" },
  { key: "canManageParents", label: "Parents", description: "Add and link parent accounts" },
  { key: "canManageClasses", label: "Classes", description: "Create classes & assign teachers" },
  { key: "canManageFees", label: "Fees", description: "Set and adjust school fees" },
  { key: "canManageResults", label: "Results", description: "Approve or override published results" },
  { key: "canPublishAnnouncements", label: "Announcements", description: "Send school-wide announcements" },
  { key: "canHandleAdmissions", label: "Admissions", description: "Review applications & set status" },
  { key: "canHandleComplaints", label: "Complaints", description: "Respond to and resolve complaints" },
  { key: "canManageLibrary", label: "Library", description: "Manage books & request approvals" },
  { key: "canRotateSession", label: "Sessions", description: "Open/close academic sessions" },
];

export default async function PermissionsPage() {
  await requireRole(["SUPER_ADMIN", "DIRECTOR"]);

  // Only ADMIN/ACCOUNTANT users get per-flag permissions; super admin and
  // director have everything implicitly.
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ACCOUNTANT"] }, isActive: true },
    include: { permissions: true },
    orderBy: { name: "asc" },
  });

  return (
    <PortalShell role="director">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Admin Permissions</h1>
        <p className="text-sm text-slate-500">Grant or limit what each admin can do. Super-admin and director have all permissions implicitly.</p>
      </div>

      {admins.length === 0 ? (
        <Card><CardBody className="py-12 text-center">
          <ShieldOff className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No admin accounts to manage</p>
          <p className="text-sm text-slate-500 mt-1">Create an ADMIN or ACCOUNTANT user first.</p>
        </CardBody></Card>
      ) : (
        <div className="space-y-6">
          {admins.map(u => {
            const p = u.permissions;
            return (
              <Card key={u.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{u.name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{u.email} · {u.role.toLowerCase()}</p>
                  </div>
                  <Badge tone="neutral">{u.role}</Badge>
                </CardHeader>
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PERMISSION_LIST.map(perm => {
                      // canRotateSession defaults to false; others default to true
                      const defaultVal = perm.key === "canRotateSession" ? false : true;
                      const current = p ? (p as unknown as Record<string, boolean>)[perm.key] ?? defaultVal : defaultVal;
                      return (
                        <form key={perm.key} action={setPermission} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${current ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"}`}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="key" value={perm.key} />
                          <input type="hidden" name="value" value={current ? "false" : "true"} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900">{perm.label}</p>
                            <p className="text-[11px] text-slate-500">{perm.description}</p>
                          </div>
                          <button
                            type="submit"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${current ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                            title={current ? "Click to revoke" : "Click to grant"}
                          >
                            {current ? <><ShieldCheck className="h-3 w-3" /> Granted</> : <><ShieldOff className="h-3 w-3" /> Revoked</>}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
