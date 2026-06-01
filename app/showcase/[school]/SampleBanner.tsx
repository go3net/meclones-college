import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

/**
 * Persistent strip pinned to the top of every sample-school page.
 * Communicates two things at all times:
 *   1. This is not a real school's site — it's a sample design.
 *   2. There's a way back to the showcase picker (and the pitch).
 */
export function SampleBanner({ schoolName }: { schoolName: string }) {
  return (
    <div className="bg-amber-50 text-amber-900 border-b border-amber-200 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Sample design — {schoolName} is not a real school.</strong> Your school's site would be custom-built for your brand.
          </span>
        </div>
        <div className="inline-flex items-center gap-4 shrink-0">
          <Link href="/showcase" className="inline-flex items-center gap-1 font-semibold hover:text-amber-700">
            <ArrowLeft className="h-3 w-3" /> All samples
          </Link>
          <Link href="/for-schools#demo" className="hidden sm:inline-flex font-semibold underline hover:text-amber-700">
            Request your demo
          </Link>
        </div>
      </div>
    </div>
  );
}
