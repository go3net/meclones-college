"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, StatCard } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { studentsByParent, classById } from "@/lib/mock-data";
import { CalendarCheck } from "lucide-react";

export default function ParentAttendance() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;

  const children = studentsByParent(user.linkedId);
  const allRecords = store.attendance.filter(a => children.some(c => c.id === a.studentId));
  const present = allRecords.filter(r => r.status === "present").length;
  const absent = allRecords.filter(r => r.status === "absent").length;
  const late = allRecords.filter(r => r.status === "late").length;
  const pct = allRecords.length ? Math.round((present / allRecords.length) * 100) : 0;

  return (
    <PortalShell role="parent">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">Daily attendance records for your child.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Overall" value={`${pct}%`} icon={<CalendarCheck className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Present" value={present} accent="emerald" />
        <StatCard label="Absent" value={absent} accent="rose" />
        <StatCard label="Late" value={late} accent="amber" />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent records</CardTitle></CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium">Date</th>
                <th className="text-left px-5 py-2.5 font-medium">Student</th>
                <th className="text-left px-5 py-2.5 font-medium">Class</th>
                <th className="text-left px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRecords.map(r => {
                const child = children.find(c => c.id === r.studentId);
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-3">{r.date}</td>
                    <td className="px-5 py-3 font-medium">{child?.name}</td>
                    <td className="px-5 py-3">{classById(r.classId)?.name}</td>
                    <td className="px-5 py-3"><Badge tone={r.status === "present" ? "success" : r.status === "late" ? "warning" : "danger"}>{r.status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
