/**
 * Tiny CSV utilities. Quotes anything containing a comma / newline /
 * double-quote and doubles internal quotes per RFC 4180. Values are
 * coerced to strings.
 */

export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  if (s.includes(",") || s.includes("\n") || s.includes('"') || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(",");
}

/** Build a full CSV body from headers + rows. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\n");
}

/**
 * Standard NextResponse helper for sending a CSV download. Sets the
 * right Content-Type and a sensible filename.
 */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Today's date as yyyy-mm-dd, useful for stamping filenames. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
