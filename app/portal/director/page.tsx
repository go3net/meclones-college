"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { loadStore } from "@/lib/store";
import { STUDENTS, TEACHERS, PARENTS, CLASSES, formatNaira } from "@/lib/mock-data";
import {
  Users, GraduationCap, UserCircle2, Wallet, CalendarCheck, ClipboardList,
  Sparkles, MessageCircle, Download, TrendingUp, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
  CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";

export default function DirectorDashboard() {
  const [store, setStore] = useState(() => loadStore());
  useEffect(() => { setStore(loadStore()); }, []);

  const totalRevenue = store.invoices.reduce((s, i) => s + i.paid, 0);
  const totalDue = store.invoices.reduce((s, i) => s + (i.amount - i.paid), 0);
  const pendingApplications = store.applications.filter(a => a.status === "submitted" || a.status === "review").length;
  const presentToday = store.attendance.filter(a => a.status === "present").length;
  const totalAttToday = store.attendance.length;
  const attendancePct = totalAttToday ? Math.round((presentToday / totalAttToday) * 100) : 94;
  const openComplaints = store.complaints.filter(c => c.status !== "resolved").length;

  const perfData = [
    { class: "JSS 1A", avg: 78 }, { class: "JSS 2A", avg: 72 },
    { class: "SS 1A", avg: 82 }, { class: "SS 3A", avg: 87 },
  ];
  const trendData = [
    { week: "W1", avg: 74 }, { week: "W2", avg: 76 }, { week: "W3", avg: 77 },
    { week: "W4", avg: 79 }, { week: "W5", avg: 81 }, { week: "W6", avg: 80 },
  ];
  const feeData = [
    { name: "Paid", value: totalRevenue, color: "#10b981" },
    { name: "Outstanding", value: totalDue, color: "#f59e0b" },
  ];

  return (
    <PortalShell role="director">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Director Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time view of the entire school · Today</p>
        </div>
        <div className="flex gap-2">
          <Link href="/portal/ai-assistant"><Button><Sparkles className="h-4 w-4" /> Ask AI</Button></Link>
          <Button variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Export Report</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Students" value={STUDENTS.length} hint="across 4 classes" icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="Teachers" value={TEACHERS.length} hint="full-time" icon={<GraduationCap className="h-5 w-5" />} accent="sky" />
        <StatCard label="Parents" value={PARENTS.length} hint="active accounts" icon={<UserCircle2 className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Revenue (term)" value={formatNaira(totalRevenue)} hint={`${formatNaira(totalDue)} outstanding`} icon={<Wallet className="h-5 w-5" />} accent="gold" />
        <StatCard label="Attendance" value={`${attendancePct}%`} hint="today" icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Applications" value={pendingApplications} hint="pending review" icon={<ClipboardList className="h-5 w-5" />} accent="amber" />
      </div>

      {/* AI Summary card */}
      <Card className="mb-6 bg-gradient-to-br from-brand-700 to-brand-900 text-white border-0">
        <CardBody>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gold-400 text-brand-900 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">AI School Summary</p>
                <Badge tone="gold" className="bg-gold-400/30 text-gold-200">This week</Badge>
              </div>
              <p className="text-slate-200 leading-relaxed">
                Attendance is steady at <strong className="text-white">{attendancePct}%</strong>. Academic average rose <strong className="text-white">+3.2%</strong> across all classes — SS3A leads at 87%.
                <strong className="text-white"> {pendingApplications}</strong> admission applications await review; <strong className="text-white">{openComplaints}</strong> open complaints. Recommended actions: review SS3A's WAEC-readiness plan, follow up with 3 parents on outstanding fees, and approve the 2 pending applications.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/portal/ai-assistant"><Button variant="gold" className="text-xs">Ask follow-up question</Button></Link>
                <Link href="/portal/director/performance"><Button variant="outline" className="text-xs bg-white/10 text-white border-white/30 hover:bg-white/20">View detailed analytics</Button></Link>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Academic Performance by Class</CardTitle><Badge tone="info">Term avg %</Badge></CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="class" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#1f3c70" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fee Collection</CardTitle></CardHeader>
          <CardBody>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={feeData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {feeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatNaira(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><span className="inline-block h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />Paid<p className="font-semibold text-slate-900">{formatNaira(totalRevenue)}</p></div>
              <div><span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-1.5" />Due<p className="font-semibold text-slate-900">{formatNaira(totalDue)}</p></div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>6-Week Performance Trend</CardTitle></CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={[60, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avg" stroke="#d49414" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link href="/portal/admin/applications"><Button variant="outline" className="w-full justify-start"><ClipboardList className="h-4 w-4" /> Review applications</Button></Link>
            <Link href="/portal/director/announcements"><Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4" /> Post announcement</Button></Link>
            <Link href="/portal/whatsapp"><Button variant="outline" className="w-full justify-start"><MessageCircle className="h-4 w-4" /> Send WhatsApp blast</Button></Link>
            <Link href="/portal/ai-assistant"><Button variant="outline" className="w-full justify-start"><Sparkles className="h-4 w-4" /> AI insights</Button></Link>
          </CardBody>
        </Card>
      </div>

      {/* Recent applications & complaints */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <Link href="/portal/admin/applications" className="text-xs text-brand-700 hover:underline">View all →</Link>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                <th className="text-left px-5 py-2.5 font-medium">Student</th>
                <th className="text-left px-5 py-2.5 font-medium">Class</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {store.applications.slice(0, 5).map(a => (
                  <tr key={a.id}>
                    <td className="px-5 py-3"><p className="font-medium text-slate-900">{a.studentName}</p><p className="text-xs text-slate-500">{a.parentName}</p></td>
                    <td className="px-5 py-3 text-slate-700">{a.classApplying}</td>
                    <td className="px-5 py-3"><Badge tone={a.status === "admitted" ? "success" : a.status === "submitted" ? "warning" : "info"}>{a.status.replace("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Complaints</CardTitle>
            <Badge tone={openComplaints > 0 ? "warning" : "success"}>{openComplaints} open</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {store.complaints.slice(0, 4).map(c => (
              <div key={c.id} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                <AlertCircle className={`h-4 w-4 mt-1 shrink-0 ${c.status === "resolved" ? "text-emerald-600" : c.status === "in_progress" ? "text-amber-600" : "text-red-600"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.subject}</p>
                  <p className="text-xs text-slate-500">{c.from} · {c.date}</p>
                </div>
                <Badge tone={c.status === "resolved" ? "success" : c.status === "in_progress" ? "warning" : "danger"}>{c.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
