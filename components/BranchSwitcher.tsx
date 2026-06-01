"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { setActiveBranch } from "@/app/portal/admin/branches/actions";

interface Branch {
  id: string;
  code: string;
  name: string;
  isMain: boolean;
}

/**
 * Branch switcher chip in the portal header. Fetches active branches
 * via /api/branches on mount; hides entirely when there are fewer
 * than two (single-branch deployments never see it).
 *
 * Changing the select submits a server action that writes the cookie
 * and reloads the current page so list views re-query with the new
 * branch scope.
 */
export function BranchSwitcher() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branches", { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return;
        setBranches(data.branches ?? []);
        setActiveId(data.activeId ?? null);
      })
      .catch(() => { /* ignore — switcher just stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  if (!branches || branches.length < 2) return null;

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fd = new FormData();
    fd.set("branchId", e.target.value);
    fd.set("return", window.location.pathname);
    await setActiveBranch(fd);
    router.refresh();
  };

  return (
    <div className="hidden md:flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
      <Building2 className="h-3.5 w-3.5 text-slate-500" />
      <select
        value={activeId ?? "ALL"}
        onChange={onChange}
        className="text-xs font-medium bg-transparent border-0 focus:outline-none focus:ring-0 pr-5 cursor-pointer"
        aria-label="Select branch"
      >
        <option value="ALL">All branches</option>
        {branches.map(b => (
          <option key={b.id} value={b.id}>
            {b.name}{b.isMain ? " · Main" : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3 w-3 text-slate-400 -ml-4 pointer-events-none" />
    </div>
  );
}
