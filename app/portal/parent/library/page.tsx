import { PortalShell } from "@/components/PortalShell";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { getSessionUser, requireRole } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { requested?: string };

export default async function ParentLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("PARENT");
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");

  return (
    <PortalShell role="parent">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Library</h1>
        <p className="text-sm text-slate-500">Buy or rent books from the school library for your child.</p>
      </div>

      {searchParams.requested && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Request submitted. The librarian will approve and notify you.
        </div>
      )}

      <LibraryBrowser userId={user.id} role="parent" />
    </PortalShell>
  );
}
