import { PortalShell } from "@/components/PortalShell";
import { LibraryBrowser } from "@/components/LibraryBrowser";
import { getCurrentStudent } from "@/lib/auth-helpers";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { requested?: string };

export default async function StudentLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const student = await getCurrentStudent();

  return (
    <PortalShell role="student">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Library</h1>
        <p className="text-sm text-slate-500">Browse the school library and request books for purchase or rental.</p>
      </div>

      {searchParams.requested && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Request submitted. The librarian will approve and notify you.
        </div>
      )}

      <LibraryBrowser userId={student.userId} role="student" />
    </PortalShell>
  );
}
