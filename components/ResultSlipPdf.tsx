/**
 * React-PDF document for the student result slip. Mirrors the print-friendly
 * HTML slip at /portal/results/[studentId]/slip but renders directly to PDF
 * for download + email attachments.
 *
 * NOTE: @react-pdf/renderer is its own renderer — components below are PDF
 * primitives, not HTML. Don't import these in a normal React tree.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { SCHOOL } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

const BRAND = "#0B1F4B";
const GOLD = "#D4A017";
const GOLD_DK = "#5e3e17";
const SLATE_500 = "#64748b";
const SLATE_700 = "#334155";
const SLATE_200 = "#e2e8f0";
const EMERALD = "#047857";
const ROSE = "#b91c1c";
const AMBER = "#b45309";

const gradeBg: Record<string, string> = {
  A1: "#d1fae5", B2: "#d1fae5", B3: "#d1fae5",
  C4: "#e0f2fe", C5: "#e0f2fe", C6: "#e0f2fe",
  D7: "#fef3c7", E8: "#fef3c7",
  F9: "#ffe4e6",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: SLATE_700, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
    marginBottom: 14,
  },
  schoolName: { fontSize: 18, fontWeight: "bold", color: BRAND, fontFamily: "Helvetica-Bold" },
  addressLine: { fontSize: 8, color: SLATE_500, marginTop: 3 },
  tagline: { fontSize: 8, color: GOLD_DK, fontFamily: "Helvetica-Bold", marginTop: 4 },
  monoBadge: {
    width: 50, height: 50, backgroundColor: BRAND, borderRadius: 6,
    justifyContent: "center", alignItems: "center",
  },
  monoBadgeText: { color: GOLD, fontSize: 26, fontFamily: "Helvetica-Bold" },
  docTitle: { fontSize: 14, fontWeight: "bold", color: BRAND, textAlign: "center", fontFamily: "Helvetica-Bold" },
  docSubtitle: { fontSize: 10, color: SLATE_500, textAlign: "center", marginBottom: 14, marginTop: 2 },

  // Info grid
  infoBox: {
    borderWidth: 1, borderColor: SLATE_200, borderRadius: 4, padding: 10, marginBottom: 14,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  infoCol: { width: "48%" },
  infoLabel: { color: SLATE_500 },
  infoValue: { color: BRAND, fontFamily: "Helvetica-Bold" },

  sectionTitle: {
    fontSize: 12, color: BRAND, fontFamily: "Helvetica-Bold", marginBottom: 6, marginTop: 4,
  },

  // Generic table
  table: { borderWidth: 1, borderColor: SLATE_200, marginBottom: 14 },
  th: {
    backgroundColor: "#f1f5f9", padding: 5, fontFamily: "Helvetica-Bold",
    fontSize: 9, color: SLATE_700, borderBottomWidth: 1, borderBottomColor: SLATE_200,
  },
  td: { padding: 5, fontSize: 9, borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tdSubject: { padding: 5, fontSize: 9, fontFamily: "Helvetica-Bold", color: BRAND, borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tdTotal: { padding: 5, fontSize: 9, fontFamily: "Helvetica-Bold", borderBottomWidth: 0.5, borderBottomColor: SLATE_200 },
  tfoot: { backgroundColor: "#f8fafc" },

  // Summary cards
  summaryRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  summaryCard: {
    flex: 1, borderWidth: 1, borderColor: SLATE_200, borderRadius: 4, padding: 8,
  },
  summaryLabel: { fontSize: 8, color: SLATE_500 },
  summaryValue: { fontSize: 14, color: BRAND, fontFamily: "Helvetica-Bold", marginTop: 2 },

  // Awards
  awardCard: {
    borderWidth: 1, borderColor: "#fde68a", backgroundColor: "#fffbeb",
    borderRadius: 4, padding: 8, marginBottom: 6,
  },
  awardStars: { color: GOLD, fontSize: 9 },
  awardCat: { fontSize: 8, color: GOLD_DK, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  awardTitle: { fontSize: 10, color: BRAND, fontFamily: "Helvetica-Bold", marginTop: 2 },
  awardCitation: { fontSize: 8, color: SLATE_500, fontStyle: "italic", marginTop: 1 },

  // Comment boxes
  commentBlock: {
    borderWidth: 1, borderColor: SLATE_200, borderRadius: 4, padding: 8,
    marginBottom: 8, backgroundColor: "#f8fafc",
  },
  commentLabel: {
    fontSize: 8, color: SLATE_500, textTransform: "uppercase",
    fontFamily: "Helvetica-Bold", letterSpacing: 0.5,
  },
  commentBody: { fontSize: 9, color: SLATE_700, marginTop: 3, lineHeight: 1.4 },
  commentAuthor: { fontSize: 7, color: SLATE_500, fontStyle: "italic", marginTop: 4 },

  // Signatures
  sigRow: { flexDirection: "row", gap: 24, marginTop: 30, paddingTop: 8, borderTopWidth: 1, borderTopColor: SLATE_200 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: "#cbd5e1", height: 32, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: SLATE_500 },

  footer: { textAlign: "center", fontSize: 8, color: "#94a3b8", marginTop: 18 },
});

export interface ResultSlipData {
  student: {
    name: string;
    admissionNumber: string;
    className: string;
    gender: string | null;
    dob: Date | null;
    parentName: string | null;
  };
  term: {
    label: string;
    sessionName: string;
  };
  results: Array<{
    id: string;
    subjectName: string;
    ca1: number;
    ca2: number;
    exam: number;
    total: number;
    grade: string | null;
  }>;
  attendance: { total: number; present: number; absent: number; late: number; rate: number };
  summary: { avg: number; position: number | null; classSize: number };
  awards: Array<{
    id: string;
    title: string;
    category: string;
    stars: number;
    citation: string | null;
  }>;
  comments: {
    classTeacher: string | null;
    classTeacherByName: string | null;
    principal: string | null;
    principalByName: string | null;
  };
}

export function ResultSlipPdf({ data }: { data: ResultSlipData }) {
  const { student, term, results, attendance, summary, awards } = data;
  const totalScore = results.reduce((s, r) => s + r.total, 0);

  return (
    <Document
      title={`${student.name} — ${term.label} ${term.sessionName} Result Slip`}
      author={SCHOOL.name}
      subject={`${term.label} Result Slip`}
    >
      <Page size="A4" style={styles.page}>
        {/* Letterhead */}
        <View style={styles.header}>
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

        <Text style={styles.docTitle}>STUDENT REPORT CARD</Text>
        <Text style={styles.docSubtitle}>{term.label}  •  Session {term.sessionName}</Text>

        {/* Student info */}
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{student.name}</Text>
            </View>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Admission #</Text>
              <Text style={[styles.infoValue, { fontFamily: "Courier-Bold" }]}>{student.admissionNumber}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Class</Text>
              <Text style={styles.infoValue}>{student.className}</Text>
            </View>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{student.gender ?? "—"}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Date of birth</Text>
              <Text style={styles.infoValue}>{student.dob ? dateFmt.format(student.dob) : "—"}</Text>
            </View>
            <View style={[styles.infoCol, { flexDirection: "row", justifyContent: "space-between" }]}>
              <Text style={styles.infoLabel}>Parent / Guardian</Text>
              <Text style={styles.infoValue}>{student.parentName ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* Academic table */}
        <Text style={styles.sectionTitle}>Academic Performance</Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 2.5, textAlign: "left" }]}>Subject</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>CA1 (20)</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>CA2 (20)</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Exam (60)</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Total</Text>
            <Text style={[styles.th, { flex: 0.8, textAlign: "center" }]}>Grade</Text>
          </View>

          {results.length === 0 ? (
            <View style={{ flexDirection: "row" }}>
              <Text style={[styles.td, { flex: 1, padding: 12, textAlign: "center", color: SLATE_500 }]}>
                No results published for this term.
              </Text>
            </View>
          ) : (
            results.map(r => (
              <View key={r.id} style={{ flexDirection: "row" }} wrap={false}>
                <Text style={[styles.tdSubject, { flex: 2.5, textAlign: "left" }]}>{r.subjectName}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{r.ca1}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{r.ca2}</Text>
                <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{r.exam}</Text>
                <Text style={[styles.tdTotal, { flex: 1, textAlign: "right" }]}>{r.total}</Text>
                <View style={[styles.td, { flex: 0.8, alignItems: "center", justifyContent: "center" }]}>
                  {r.grade && (
                    <Text style={{
                      fontFamily: "Helvetica-Bold",
                      fontSize: 9,
                      backgroundColor: gradeBg[r.grade] ?? "#f1f5f9",
                      paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 4, paddingRight: 4,
                      borderRadius: 3,
                    }}>
                      {r.grade}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}

          {results.length > 0 && (
            <View style={[{ flexDirection: "row" }, styles.tfoot]}>
              <Text style={[styles.tdTotal, { flex: 2.5, textAlign: "left" }]}>TOTAL</Text>
              <Text style={[styles.td, { flex: 1 }]}> </Text>
              <Text style={[styles.td, { flex: 1 }]}> </Text>
              <Text style={[styles.td, { flex: 1 }]}> </Text>
              <Text style={[styles.tdTotal, { flex: 1, textAlign: "right" }]}>{totalScore}</Text>
              <Text style={[styles.td, { flex: 0.8 }]}> </Text>
            </View>
          )}
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{summary.avg}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Position</Text>
            <Text style={styles.summaryValue}>
              {summary.position ? `${summary.position}${summary.classSize > 0 ? ` of ${summary.classSize}` : ""}` : "—"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Subjects</Text>
            <Text style={styles.summaryValue}>{results.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Attendance</Text>
            <Text style={styles.summaryValue}>{attendance.total > 0 ? `${attendance.rate}%` : "—"}</Text>
          </View>
        </View>

        {/* Attendance breakdown */}
        <Text style={styles.sectionTitle}>Attendance</Text>
        <View style={styles.table}>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.th, { flex: 1.5, textAlign: "left" }]}>Days recorded</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Present</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Absent</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Late</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: "right" }]}>Rate</Text>
          </View>
          <View style={{ flexDirection: "row" }}>
            <Text style={[styles.tdTotal, { flex: 1.5, textAlign: "left" }]}>{attendance.total}</Text>
            <Text style={[styles.td, { flex: 1, textAlign: "right", color: EMERALD }]}>{attendance.present}</Text>
            <Text style={[styles.td, { flex: 1, textAlign: "right", color: ROSE }]}>{attendance.absent}</Text>
            <Text style={[styles.td, { flex: 1, textAlign: "right", color: AMBER }]}>{attendance.late}</Text>
            <Text style={[styles.tdTotal, { flex: 1.2, textAlign: "right" }]}>
              {attendance.total > 0 ? `${attendance.rate}%` : "—"}
            </Text>
          </View>
        </View>

        {/* Awards */}
        {awards.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Awards & Recognition</Text>
            {awards.map(a => (
              <View key={a.id} style={styles.awardCard} wrap={false}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Text style={styles.awardStars}>{"★".repeat(a.stars)}{"☆".repeat(5 - a.stars)}</Text>
                  <Text style={styles.awardCat}>{a.category.replace(/_/g, " ").toLowerCase()}</Text>
                </View>
                <Text style={styles.awardTitle}>{a.title}</Text>
                {a.citation && <Text style={styles.awardCitation}>"{a.citation}"</Text>}
              </View>
            ))}
          </>
        )}

        {/* Comments (class teacher + principal) */}
        {(data.comments.classTeacher || data.comments.principal) && (
          <>
            <Text style={styles.sectionTitle}>Comments</Text>
            {data.comments.classTeacher && (
              <View style={styles.commentBlock} wrap={false}>
                <Text style={styles.commentLabel}>Class Teacher's Comment</Text>
                <Text style={styles.commentBody}>{data.comments.classTeacher}</Text>
                {data.comments.classTeacherByName && (
                  <Text style={styles.commentAuthor}>— {data.comments.classTeacherByName}</Text>
                )}
              </View>
            )}
            {data.comments.principal && (
              <View style={[styles.commentBlock, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]} wrap={false}>
                <Text style={styles.commentLabel}>Principal's Comment</Text>
                <Text style={styles.commentBody}>{data.comments.principal}</Text>
                {data.comments.principalByName && (
                  <Text style={styles.commentAuthor}>— {data.comments.principalByName}</Text>
                )}
              </View>
            )}
          </>
        )}

        {/* Signatures */}
        <View style={styles.sigRow}>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Class Teacher</Text>
          </View>
          <View style={styles.sigBlock}>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Principal / Director</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by {SCHOOL.name} Portal • {dateFmt.format(new Date())}
        </Text>
      </Page>
    </Document>
  );
}
