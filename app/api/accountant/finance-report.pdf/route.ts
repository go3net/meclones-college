/**
 * On-demand PDF endpoint for the school finance / payments report. Same
 * data as the on-screen preview at /portal/accountant/reports — the
 * route just hands the data to FinanceReportPdf and streams the buffer.
 *
 * Query params:
 *   preset  — "today" | "week" | "month" | "term" | "custom" (default "month")
 *   from    — yyyy-mm-dd (only for "custom")
 *   to      — yyyy-mm-dd (only for "custom")
 *
 * Auth: ACCOUNTANT / ADMIN / DIRECTOR / SUPER_ADMIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getSessionUser } from "@/lib/auth-helpers";
import { loadFinanceReportData, deriveRangeLabel } from "@/lib/finance-report-data";
import { FinanceReportPdf } from "@/components/FinanceReportPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!["ACCOUNTANT", "ADMIN", "DIRECTOR", "SUPER_ADMIN"].includes(user.role)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const preset = url.searchParams.get("preset") ?? "month";
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");

  const { from, to } = resolveRange(preset, fromRaw, toRaw);
  const rangeLabel = deriveRangeLabel(from, to, preset);

  const data = await loadFinanceReportData({ from, to, rangeLabel, generatedBy: user.name });
  if (!data) return new NextResponse("No active term — set one before generating reports.", { status: 404 });

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(createElement(FinanceReportPdf, { data }));
  } catch (err) {
    console.error("[finance-report.pdf] render failed", err);
    return new NextResponse("PDF render failed", { status: 500 });
  }

  const stampedRange = rangeLabel.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `meclones_finance_${stampedRange}_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

function resolveRange(preset: string, fromRaw: string | null, toRaw: string | null): { from: Date; to: Date } {
  const now = new Date();
  if (preset === "today") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (preset === "term") {
    // Active-term window: now backward 90 days as a coarse proxy, since
    // Term has optional start/endDate. The breakdowns themselves are always
    // term-scoped via the active term filter inside the loader.
    const start = new Date(now);
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (preset === "custom" && fromRaw && toRaw) {
    const start = new Date(fromRaw); start.setHours(0, 0, 0, 0);
    const end = new Date(toRaw); end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  // Default: this month.
  const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}
