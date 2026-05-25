/**
 * Server-side PDF: school finance / payments report. Driven by a date
 * range — the accountant picks "this month", "this term", or any custom
 * window and we render summary + breakdowns + line items.
 *
 * Same `@react-pdf/renderer` tech as the result slip. Don't import in a
 * normal React tree — PDF primitives only.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SCHOOL } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const nairaFmt = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

const BRAND = "#0B1F4B";
const GOLD = "#D4A017";
const GOLD_DK = "#5e3e17";
const SLATE_500 = "#64748b";
const SLATE_700 = "#334155";
const SLATE_200 = "#e2e8f0";
const EMERALD = "#047857";
const ROSE = "#b91c1c";
const AMBER = "#b45309";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, color: SLATE_700, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
    marginBottom: 14,
  },
  schoolName: { fontSize: 16, fontWeight: "bold", color: BRAND, fontFamily: "Helvetica-Bold" },
  addressLine: { fontSize: 8, color: SLATE_500, marginTop: 3 },
  tagline: { fontSize: 8, color: GOLD_DK, fontFamily: "Helvetica-Bold", marginTop: 4 },
  monoBadge: {
    width: 44, height: 44, backgroundColor: BRAND, borderRadius: 6,
    justifyContent: "center", alignItems: "center",
  },
  monoBadgeText: { color: GOLD, fontSize: 22, fontFamily: "Helvetica-Bold" },

  docTitle: { fontSize: 13, fontWeight: "bold", color: BRAND, textAlign: "center", fontFamily: "Helvetica-Bold" },
  docSubtitle: { fontSize: 9, color: SLATE_500, textAlign: "center", marginBottom: 14, marginTop: 2 },

  sectionTitle: {
    fontSize: 11, color: BRAND, fontFamily: "Helvetica-Bold",
    marginBottom: 6, marginTop: 10,
    borderBottomWidth: 1, borderBottomColor: SLATE_200, paddingBottom: 3,
  },

  // KPI strip
  kpiRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  kpi: {
    flex: 1, borderWidth: 1, borderColor: SLATE_200, borderRadius: 4,
    padding: 8, backgroundColor: "#f8fafc",
  },
  kpiLabel: { fontSize: 7, color: SLATE_500, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 13, color: BRAND, fontFamily: "Helvetica-Bold", marginTop: 2 },

  // Generic table
  table: { borderWidth: 1, borderColor: SLATE_200, marginBottom: 10 },
  th: {
    backgroundColor: "#f1f5f9", padding: 4, fontFamily: "Helvetica-Bold",
    fontSize: 8, color: SLATE_700, borderBottomWidth: 1, borderBottomColor: SLATE_200,
  },
  td: { padding: 4, fontSize: 8, borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tdBold: { padding: 4, fontSize: 8, fontFamily: "Helvetica-Bold", borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tfoot: { backgroundColor: "#f8fafc" },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    paddingTop: 6,
  },
});

export interface FinanceReportData {
  rangeLabel: string;
  rangeFrom: Date;
  rangeTo: Date;
  generatedBy: string;
  generatedAt: Date;

  totals: {
    billed: number;       // Billed within the active term (always)
    collected: number;    // Sum of SUCCESS payments in the window
    outstanding: number;  // Term-level outstanding
    paymentsCount: number;
    studentsBilled: number;
    debtors: number;
  };

  methodBreakdown: Array<{ method: string; count: number; amount: number }>;
  classBreakdown: Array<{ className: string; billed: number; paid: number; balance: number; collectionPct: number }>;
  feeTypeBreakdown: Array<{ feeType: string; billed: number; paid: number; collectionPct: number }>;

  payments: Array<{
    id: string;
    paidAt: Date | null;
    studentName: string;
    admissionNumber: string;
    className: string;
    feeType: string;
    method: string;
    reference: string;
    amount: number;
    reconciledAt: Date | null;
  }>;

  topDebtors: Array<{
    studentName: string;
    admissionNumber: string;
    className: string;
    parentName: string | null;
    parentPhone: string | null;
    outstanding: number;
  }>;
}

const methodLabel: Record<string, string> = {
  PAYSTACK: "Paystack",
  CASH: "Cash",
  TRANSFER: "Transfer",
  CHEQUE: "Cheque",
  POS: "POS",
  OTHER: "Other",
};

export function FinanceReportPdf({ data }: { data: FinanceReportData }) {
  const collectionPct = data.totals.billed > 0
    ? Math.round((data.totals.collected / data.totals.billed) * 100)
    : 0;

  // Cap the payments list at 200 rows in the PDF (CSV export is the path
  // for unbounded exports). Anything more makes the PDF a wall of text.
  const paymentRows = data.payments.slice(0, 200);
  const truncatedBy = data.payments.length - paymentRows.length;

  return (
    <Document
      title={`${SCHOOL.shortName} Finance Report — ${data.rangeLabel}`}
      author={SCHOOL.name}
      subject="School fee collection report"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Letterhead */}
        <View style={styles.header} fixed>
          <View style={{ flex: 1 }}>
            <Text style={styles.schoolName}>{SCHOOL.name}</Text>
            <Text style={styles.addressLine}>{SCHOOL.address}</Text>
            <Text style={styles.addressLine}>Tel: {SCHOOL.phone}  •  {SCHOOL.email}</Text>
            <Text style={styles.tagline}>{SCHOOL.tagline}</Text>
          </View>
          <View style={styles.monoBadge}>
            <Text style={styles.monoBadgeText}>M</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>FINANCE / FEE COLLECTION REPORT</Text>
        <Text style={styles.docSubtitle}>{data.rangeLabel}  •  {dateFmt.format(data.rangeFrom)} – {dateFmt.format(data.rangeTo)}</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Billed (term)</Text>
            <Text style={styles.kpiValue}>{nairaFmt.format(data.totals.billed)}</Text>
            <Text style={{ fontSize: 7, color: SLATE_500, marginTop: 1 }}>{data.totals.studentsBilled} students</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Collected (range)</Text>
            <Text style={[styles.kpiValue, { color: EMERALD }]}>{nairaFmt.format(data.totals.collected)}</Text>
            <Text style={{ fontSize: 7, color: SLATE_500, marginTop: 1 }}>{data.totals.paymentsCount} payment{data.totals.paymentsCount === 1 ? "" : "s"}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: data.totals.outstanding > 0 ? ROSE : EMERALD }]}>
              {nairaFmt.format(data.totals.outstanding)}
            </Text>
            <Text style={{ fontSize: 7, color: SLATE_500, marginTop: 1 }}>{data.totals.debtors} debtor{data.totals.debtors === 1 ? "" : "s"}</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Collection</Text>
            <Text style={[styles.kpiValue, { color: collectionPct >= 80 ? EMERALD : collectionPct >= 50 ? AMBER : ROSE }]}>
              {collectionPct}%
            </Text>
            <Text style={{ fontSize: 7, color: SLATE_500, marginTop: 1 }}>of term billed</Text>
          </View>
        </View>

        {/* Payment method breakdown */}
        <Text style={styles.sectionTitle}>By payment method</Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 2 }]}>Method</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Count</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Amount</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Share</Text>
          </View>
          {data.methodBreakdown.length === 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Text style={[styles.td, { flex: 1, padding: 10, textAlign: "center", color: SLATE_500 }]}>No payments in range.</Text>
            </View>
          ) : data.methodBreakdown.map(m => {
            const share = data.totals.collected > 0 ? Math.round((m.amount / data.totals.collected) * 100) : 0;
            return (
              <View key={m.method} style={{ flexDirection: "row" }} wrap={false}>
                <Text style={[styles.tdBold, { flex: 2, color: BRAND }]}>{methodLabel[m.method] ?? m.method}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{m.count}</Text>
                <Text style={[styles.tdBold, { flex: 1.5, textAlign: "right" }]}>{nairaFmt.format(m.amount)}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{share}%</Text>
              </View>
            );
          })}
        </View>

        {/* Per-class breakdown */}
        <Text style={styles.sectionTitle}>By class (term-to-date)</Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 1.5 }]}>Class</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Billed</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Paid</Text>
            <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Balance</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: "right" }]}>%</Text>
          </View>
          {data.classBreakdown.map(c => (
            <View key={c.className} style={{ flexDirection: "row" }} wrap={false}>
              <Text style={[styles.tdBold, { flex: 1.5, color: BRAND }]}>{c.className}</Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right" }]}>{nairaFmt.format(c.billed)}</Text>
              <Text style={[styles.td, { flex: 1.4, textAlign: "right", color: EMERALD }]}>{nairaFmt.format(c.paid)}</Text>
              <Text style={[styles.tdBold, { flex: 1.4, textAlign: "right", color: c.balance > 0 ? ROSE : SLATE_700 }]}>
                {nairaFmt.format(c.balance)}
              </Text>
              <Text style={[styles.tdBold, { flex: 0.8, textAlign: "right",
                color: c.collectionPct >= 80 ? EMERALD : c.collectionPct >= 50 ? AMBER : ROSE }]}>
                {c.collectionPct}%
              </Text>
            </View>
          ))}
        </View>

        {/* Per-fee-type */}
        <Text style={styles.sectionTitle}>By fee type (term-to-date)</Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 2 }]}>Fee item</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Billed</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>Paid</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: "right" }]}>%</Text>
          </View>
          {data.feeTypeBreakdown.map(f => (
            <View key={f.feeType} style={{ flexDirection: "row" }} wrap={false}>
              <Text style={[styles.tdBold, { flex: 2, color: BRAND }]}>{f.feeType}</Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right" }]}>{nairaFmt.format(f.billed)}</Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right", color: EMERALD }]}>{nairaFmt.format(f.paid)}</Text>
              <Text style={[styles.tdBold, { flex: 0.8, textAlign: "right" }]}>{f.collectionPct}%</Text>
            </View>
          ))}
        </View>

        {/* Top debtors */}
        {data.topDebtors.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top outstanding balances</Text>
            <View style={styles.table}>
              <View style={{ flexDirection: "row" }}>
                <Text style={[styles.th, { flex: 2 }]}>Student</Text>
                <Text style={[styles.th, { flex: 1 }]}>Class</Text>
                <Text style={[styles.th, { flex: 2 }]}>Parent</Text>
                <Text style={[styles.th, { flex: 1.4, textAlign: "right" }]}>Outstanding</Text>
              </View>
              {data.topDebtors.map(d => (
                <View key={d.admissionNumber} style={{ flexDirection: "row" }} wrap={false}>
                  <View style={[{ flex: 2 }, styles.td]}>
                    <Text style={{ fontSize: 8, color: BRAND, fontFamily: "Helvetica-Bold" }}>{d.studentName}</Text>
                    <Text style={{ fontSize: 7, color: SLATE_500 }}>{d.admissionNumber}</Text>
                  </View>
                  <Text style={[styles.td, { flex: 1 }]}>{d.className}</Text>
                  <View style={[{ flex: 2 }, styles.td]}>
                    <Text style={{ fontSize: 8, color: SLATE_700 }}>{d.parentName ?? "—"}</Text>
                    {d.parentPhone && <Text style={{ fontSize: 7, color: SLATE_500 }}>{d.parentPhone}</Text>}
                  </View>
                  <Text style={[styles.tdBold, { flex: 1.4, textAlign: "right", color: ROSE }]}>
                    {nairaFmt.format(d.outstanding)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Transactions in range */}
        <Text style={styles.sectionTitle}>
          Payments in this range ({paymentRows.length}{truncatedBy > 0 ? ` of ${data.payments.length}` : ""})
        </Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 1.1 }]}>Date</Text>
            <Text style={[styles.th, { flex: 2 }]}>Student</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Class</Text>
            <Text style={[styles.th, { flex: 1.4 }]}>Fee</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Method</Text>
            <Text style={[styles.th, { flex: 1.6 }]}>Reference</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Amount</Text>
            <Text style={[styles.th, { flex: 0.5, textAlign: "center" }]}>R</Text>
          </View>
          {paymentRows.length === 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Text style={[styles.td, { flex: 1, padding: 10, textAlign: "center", color: SLATE_500 }]}>
                No payments in this range.
              </Text>
            </View>
          ) : paymentRows.map(p => (
            <View key={p.id} style={{ flexDirection: "row" }} wrap={false}>
              <Text style={[styles.td, { flex: 1.1, fontSize: 7 }]}>
                {p.paidAt ? dateFmt.format(p.paidAt) : "—"}
              </Text>
              <View style={[{ flex: 2 }, styles.td]}>
                <Text style={{ fontSize: 8, color: BRAND, fontFamily: "Helvetica-Bold" }}>{p.studentName}</Text>
                <Text style={{ fontSize: 7, color: SLATE_500 }}>{p.admissionNumber}</Text>
              </View>
              <Text style={[styles.td, { flex: 0.8 }]}>{p.className}</Text>
              <Text style={[styles.td, { flex: 1.4 }]}>{p.feeType}</Text>
              <Text style={[styles.td, { flex: 0.8, fontSize: 7 }]}>{methodLabel[p.method] ?? p.method}</Text>
              <Text style={[styles.td, { flex: 1.6, fontSize: 7, color: SLATE_500 }]}>{p.reference}</Text>
              <Text style={[styles.tdBold, { flex: 1, textAlign: "right", color: EMERALD }]}>
                {nairaFmt.format(p.amount)}
              </Text>
              <Text style={[styles.td, { flex: 0.5, textAlign: "center", color: p.reconciledAt ? EMERALD : SLATE_500 }]}>
                {p.reconciledAt ? "✓" : "·"}
              </Text>
            </View>
          ))}
          {paymentRows.length > 0 && (
            <View style={[{ flexDirection: "row" }, styles.tfoot]}>
              <Text style={[styles.tdBold, { flex: 7.7 }]}>TOTAL</Text>
              <Text style={[styles.tdBold, { flex: 1, textAlign: "right", color: EMERALD }]}>
                {nairaFmt.format(paymentRows.reduce((s, p) => s + p.amount, 0))}
              </Text>
              <Text style={[styles.td, { flex: 0.5 }]}> </Text>
            </View>
          )}
        </View>

        {truncatedBy > 0 && (
          <Text style={{ fontSize: 7, color: SLATE_500, fontStyle: "italic" }}>
            … {truncatedBy} more payment{truncatedBy === 1 ? "" : "s"} omitted from PDF. Use the CSV export for the full list.
          </Text>
        )}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) =>
          `${SCHOOL.name} · Finance Report · Generated by ${data.generatedBy} on ${dateTimeFmt.format(data.generatedAt)} · Page ${pageNumber} of ${totalPages}`
        } />
      </Page>
    </Document>
  );
}
