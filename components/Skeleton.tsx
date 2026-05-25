/**
 * Skeleton primitives for Next.js App Router loading.tsx files. Used to
 * replace the "blank page → flash of content" pattern with a graceful
 * shimmer while server components are fetching.
 *
 * These intentionally render as flat HTML (no client interactivity) so
 * they ship as static-render output and start streaming immediately.
 */

import { PortalShell } from "@/components/PortalShell";

const SHELL_ROLE = "school_admin" as const;

/** A single shimmering box. `className` for size/shape, `style` for one-offs. */
export function SkeletonBox({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} style={style} />;
}

/** Stat-tile-shaped placeholder. Matches StatCard from components/ui.tsx. */
export function SkeletonStatTile() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <SkeletonBox className="h-3 w-20 mb-3" />
      <SkeletonBox className="h-7 w-24 mb-2" />
      <SkeletonBox className="h-2.5 w-16" />
    </div>
  );
}

/** Row of N stat tiles. Default 4. */
export function SkeletonStatRow({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 ${count >= 4 ? "md:grid-cols-4" : count === 3 ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}>
      {Array.from({ length: count }).map((_, i) => <SkeletonStatTile key={i} />)}
    </div>
  );
}

/** Card-shaped placeholder. Optional `rows` for list-like content. */
export function SkeletonCard({
  rows = 4,
  title = true,
  className = "",
}: {
  rows?: number;
  title?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-4 w-10" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBox className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBox className="h-3.5 w-3/4" />
              <SkeletonBox className="h-2.5 w-1/2" />
            </div>
            <SkeletonBox className="h-3 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table-shaped placeholder. Defaults to 6 columns × 8 rows. */
export function SkeletonTable({
  columns = 6,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <SkeletonBox className="h-4 w-32" />
        <SkeletonBox className="h-5 w-16" />
      </div>
      <div className="divide-y divide-slate-100">
        {/* Header */}
        <div className="px-4 py-2.5 bg-slate-50">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <SkeletonBox key={i} className="h-3" />
            ))}
          </div>
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-2.5">
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, c) => (
                <SkeletonBox key={c} className="h-3.5" style={{ width: `${50 + ((r + c) * 7) % 50}%` } as React.CSSProperties} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Header strip with title + subtitle + optional right-side button placeholder. */
export function SkeletonHeader({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
      <div className="space-y-2">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="h-7 w-64" />
        <SkeletonBox className="h-3 w-80" />
      </div>
      {withAction && <SkeletonBox className="h-9 w-36 rounded-lg" />}
    </div>
  );
}

/**
 * Full-page wrapper. Drops the skeleton inside a PortalShell so the
 * sidebar/header don't flicker while the page content loads. The
 * `role` prop should match the route segment.
 */
export function PageSkeleton({
  role = SHELL_ROLE,
  variant = "dashboard",
  withAction = true,
}: {
  role?: "director" | "school_admin" | "accountant" | "teacher" | "parent" | "student";
  variant?: "dashboard" | "table" | "detail";
  withAction?: boolean;
}) {
  return (
    <PortalShell role={role}>
      <SkeletonHeader withAction={withAction} />
      {variant === "dashboard" && (
        <>
          <SkeletonStatRow count={4} />
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <SkeletonCard rows={4} />
            <SkeletonCard rows={4} />
          </div>
        </>
      )}
      {variant === "table" && (
        <>
          <div className="mb-4"><SkeletonBox className="h-12 w-full rounded-lg" /></div>
          <SkeletonTable columns={6} rows={10} />
        </>
      )}
      {variant === "detail" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <SkeletonCard rows={5} className="lg:col-span-1" />
          <SkeletonCard rows={7} className="lg:col-span-2" />
        </div>
      )}
    </PortalShell>
  );
}
