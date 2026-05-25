import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-helpers";
import { updateOwnProfile, changeOwnPassword } from "./actions";
import { ArrowLeft, AlertCircle, CheckCircle2, KeyRound, User as UserIcon, Save, Bell, ChevronRight } from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";

export const dynamic = "force-dynamic";

// Map UPPER auth role to the mock shell role used by PortalShell.
const SHELL_ROLE: Record<string, "director" | "school_admin" | "accountant" | "teacher" | "parent" | "student"> = {
  SUPER_ADMIN: "director",
  DIRECTOR: "director",
  ADMIN: "school_admin",
  ACCOUNTANT: "accountant",
  TEACHER: "teacher",
  STUDENT: "student",
  PARENT: "parent",
};

type SearchParams = { updated?: string; passwordChanged?: string; error?: string; passwordError?: string };

const roleTone: Record<string, "neutral" | "info" | "warning" | "success" | "gold"> = {
  SUPER_ADMIN: "gold",
  DIRECTOR: "gold",
  ADMIN: "info",
  ACCOUNTANT: "info",
  TEACHER: "success",
  PARENT: "neutral",
  STUDENT: "warning",
};

export default async function MyProfilePage({ searchParams }: { searchParams: SearchParams }) {
  const sess = await getSessionUser();
  if (!sess) redirect("/portal/login");

  const user = await prisma.user.findUnique({
    where: { id: sess.id },
    include: {
      student: { include: { classRef: true } },
      teacher: { select: { bio: true, subjects: { include: { subject: { select: { code: true, name: true } } } } } },
      parent: { include: { children: { include: { student: { include: { user: { select: { name: true } } } } } } } },
    },
  });
  if (!user) redirect("/portal/login");

  const shellRole = SHELL_ROLE[user.role] ?? "parent";

  return (
    <PortalShell role={shellRole}>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/me" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">My Profile</h1>
          <p className="text-sm text-slate-500">Update your details and password.</p>
        </div>
      </div>

      {searchParams.updated && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Profile updated.</div>
      )}
      {searchParams.passwordChanged && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Password changed. Use it on your next login.</div>
      )}
      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}</div>
      )}
      {searchParams.passwordError && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.passwordError)}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Identity card */}
        <Card>
          <CardHeader><CardTitle><UserIcon className="h-4 w-4 inline mr-1" /> You</CardTitle></CardHeader>
          <CardBody className="text-sm space-y-3">
            <div className="flex items-center gap-3">
              {user.image ? (
                <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-gold-200">
                  <Image src={user.image} alt={user.name} fill sizes="64px" className="object-cover" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold">
                  {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
              )}
              <div>
                <p className="font-semibold text-brand-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <Badge tone={roleTone[user.role]}>{user.role.toLowerCase().replace("_", " ")}</Badge>
              </div>
            </div>
            {user.student && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">Admission #</p>
                <p className="font-mono text-slate-900">{user.student.admissionNumber}</p>
                {user.student.classRef && <p className="text-xs text-slate-500 mt-1">Class: <strong>{user.student.classRef.name}{user.student.classRef.arm}</strong></p>}
              </div>
            )}
            {user.teacher && (
              <div className="pt-2 border-t border-slate-100">
                {user.teacher.bio && <p className="text-xs text-slate-600 italic">"{user.teacher.bio}"</p>}
                {user.teacher.subjects.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {user.teacher.subjects.map(s => <Badge key={s.subject.code} tone="info">{s.subject.code}</Badge>)}
                  </div>
                )}
              </div>
            )}
            {user.parent && user.parent.children.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Linked children</p>
                <div className="flex flex-wrap gap-1">
                  {user.parent.children.map(c => (
                    <Badge key={c.id} tone="neutral">{c.student.user.name}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Update profile */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Update profile</CardTitle>
            <Link href="/portal/me/notifications" className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
              <Bell className="h-3 w-3" /> Email notifications <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardBody>
            <form action={updateOwnProfile} className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Profile photo</Label>
                <PhotoUpload name="image" defaultUrl={user.image} alt={user.name} />
              </div>
              <div><Label>Full name *</Label><Input name="name" defaultValue={user.name} required minLength={2} /></div>
              <div><Label>Email</Label><Input value={user.email} disabled readOnly className="bg-slate-50" /></div>
              <div className="sm:col-span-2"><Label>Phone (WhatsApp)</Label><Input name="phone" defaultValue={user.phone ?? ""} placeholder="+234..." /></div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="gold"><Save className="h-4 w-4" /> Save profile</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Change password */}
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle><KeyRound className="h-4 w-4 inline mr-1" /> Change password</CardTitle></CardHeader>
          <CardBody>
            <form action={changeOwnPassword} className="grid sm:grid-cols-3 gap-4">
              <div><Label>Current password *</Label><Input name="currentPassword" type="password" required autoComplete="current-password" /></div>
              <div><Label>New password *</Label><Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></div>
              <div><Label>Confirm new password *</Label><Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></div>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" variant="outline"><KeyRound className="h-4 w-4" /> Change password</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
