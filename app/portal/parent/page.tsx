"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button, Empty } from "@/components/ui";
import { loadStore } from "@/lib/store";
import { currentUser } from "@/lib/auth";
import {
  STUDENTS, INVOICES, RESULTS, ATTENDANCE, ANNOUNCEMENTS, CLASSES,
  studentsByParent, formatNaira, classById,
} from "@/lib/mock-data";
import { CalendarCheck, CreditCard, FileText, MessageCircle, Brain, ChevronRight, Bell } from "lucide-react";

export default function ParentDashboard() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;

  const children = studentsByParent(user.linkedId);
  const child = children[0]; // primary for the overview
  const invoice = child ? store.invoices.find(i => i.studentId === child.id) : null;
  const result = child ? store.results.find(r => r.studentId === child.id) : null;
  const childAttendance = child ? store.attendance.filter(a => a.studentId === child.id) : [];
  const presentDays = childAttendance.filter(a => a.status === "present").length;
  const attendancePct = childAttendance.length ? Math.round((presentDays / childAttendance.length) * 100) : 92;

  return (
    <PortalShell role="parent">
      <h1 className="text-2xl font-bold text-brand-900">Welcome, {user.name.split(" ")[0]}</h1>
      <p className="text-sm text-slate-500 mb-6">Here's a snapshot of {children.length > 1 ? "your children" : `${child?.name?.split(" ")[0]}`} this week.</p>

      {/* Children switcher */}
      {children.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {children.map((c, i) => (
            <button key={c.id} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${i === 0 ? "bg-brand-700 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>
              {c.name} · {classById(c.classId)?.name}
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Attendance" value={`${attendancePct}%`} hint={`${presentDays}/${childAttendance.length || "—"} days`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Position in class" value={result?.position ? `${result.position}${ordinal(result.position)}` : "—"} hint={result?.term || ""} icon={<FileText className="h-5 w-5" />} accent="brand" />
        <StatCard label="Fee balance" value={invoice ? formatNaira(invoice.amount - invoice.paid) : "—"} hint={invoice ? `of ${formatNaira(invoice.amount)}` : ""} icon={<CreditCard className="h-5 w-5" />} accent={invoice && invoice.amount > invoice.paid ? "amber" : "emerald"} />
        <StatCard label="Term avg" value={result ? avgScore(result) + "%" : "—"} hint="Across subjects" icon={<FileText className="h-5 w-5" />} accent="gold" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Child profile */}
        <Card>
          <CardHeader><CardTitle>{child?.name}</CardTitle><Badge tone="info">{classById(child?.classId || "")?.name}</Badge></CardHeader>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-16 w-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">{child?.name.split(" ").map(n => n[0]).join("")}</div>
              <div>
                <p className="text-sm text-slate-500">Admission No.</p>
                <p className="font-medium">{child?.admissionNo}</p>
              </div>
            </div>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between"><dt className="text-slate-500">Date of Birth</dt><dd className="font-medium">{child?.dob}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Gender</dt><dd className="font-medium">{child?.gender === "M" ? "Male" : "Female"}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd className="font-medium">{classById(child?.classId || "")?.name}</dd></div>
            </dl>
            <Link href="/portal/parent/results"><Button variant="outline" className="w-full mt-4">View Full Profile</Button></Link>
          </CardBody>
        </Card>

        {/* Fee balance card */}
        <Card>
          <CardHeader><CardTitle>Fees · {invoice?.term}</CardTitle></CardHeader>
          <CardBody>
            {invoice ? (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">Balance</span>
                  <span className="text-2xl font-bold text-brand-900">{formatNaira(invoice.amount - invoice.paid)}</span>
                </div>
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (invoice.paid / invoice.amount) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Paid: {formatNaira(invoice.paid)}</span>
                  <span>Total: {formatNaira(invoice.amount)}</span>
                </div>
                <Badge tone={invoice.status === "paid" ? "success" : invoice.status === "partial" ? "warning" : "danger"} className="mt-3">{invoice.status}</Badge>
                <Link href="/portal/parent/fees"><Button variant="gold" className="w-full mt-4">{invoice.status === "paid" ? "View Receipt" : "Pay Now"}</Button></Link>
              </>
            ) : <Empty title="No invoice yet" />}
          </CardBody>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link href="/portal/parent/chatbot"><Button variant="outline" className="w-full justify-start"><Brain className="h-4 w-4" /> Ask AI Chatbot</Button></Link>
            <Link href="/portal/parent/results"><Button variant="outline" className="w-full justify-start"><FileText className="h-4 w-4" /> View Results</Button></Link>
            <Link href="/portal/parent/attendance"><Button variant="outline" className="w-full justify-start"><CalendarCheck className="h-4 w-4" /> Attendance Record</Button></Link>
            <Link href="/portal/whatsapp"><Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4" /> Message School</Button></Link>
          </CardBody>
        </Card>
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader>
          <CardTitle>School Announcements</CardTitle>
          <Bell className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardBody className="space-y-3">
          {store.announcements.slice(0, 4).map(a => (
            <div key={a.id} className="border-l-2 border-brand-500 pl-3 py-1">
              <p className="font-medium text-slate-900">{a.title}</p>
              <p className="text-sm text-slate-600 mt-0.5">{a.body}</p>
              <p className="text-xs text-slate-400 mt-1">{a.date}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </PortalShell>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function avgScore(r: any) {
  if (!r?.subjects?.length) return 0;
  const sum = r.subjects.reduce((s: number, x: any) => s + x.total, 0);
  return Math.round(sum / r.subjects.length);
}
