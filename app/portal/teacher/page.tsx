"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { TEACHERS, CLASSES, STUDENTS, teacherById, classById, studentsByClass, subjectById } from "@/lib/mock-data";
import { Users, ClipboardList, CheckSquare, FileText, BookMarked, Calendar } from "lucide-react";

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;

  const teacher = teacherById(user.linkedId);
  const myClasses = teacher ? CLASSES.filter(c => teacher.classes.includes(c.id)) : [];
  const totalStudents = myClasses.reduce((s, c) => s + studentsByClass(c.id).length, 0);
  const myAssignments = store.assignments.filter(a => a.teacherId === teacher?.id);
  const pendingSubmissions = myAssignments.reduce((s, a) => s + (a.submissions.length), 0);

  const timetable = [
    { time: "08:00 – 08:40", subject: "Mathematics", class: "JSS 2A", room: "Block A-12" },
    { time: "08:45 – 09:25", subject: "Mathematics", class: "SS 1A", room: "Block B-04" },
    { time: "10:00 – 10:40", subject: "Mathematics", class: "SS 1A", room: "Block B-04" },
    { time: "11:30 – 12:10", subject: "Mathematics", class: "JSS 2A", room: "Block A-12" },
    { time: "13:00 – 13:40", subject: "Mathematics", class: "SS 1A", room: "Block B-04" },
  ];

  return (
    <PortalShell role="teacher">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Welcome, {user.name.split(" ").slice(0, 2).join(" ")}</h1>
      <p className="text-sm text-slate-500 mb-6">{teacher?.subjects.map(s => subjectById(s)?.name).join(" · ")} · Today is {new Date().toLocaleDateString("en-NG", { weekday: "long", month: "short", day: "numeric" })}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="My classes" value={myClasses.length} icon={<Users className="h-5 w-5" />} accent="brand" />
        <StatCard label="My students" value={totalStudents} icon={<Users className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Open assignments" value={myAssignments.length} icon={<ClipboardList className="h-5 w-5" />} accent="amber" />
        <StatCard label="Submissions" value={pendingSubmissions} hint="to grade" icon={<FileText className="h-5 w-5" />} accent="sky" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>My Classes</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {myClasses.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-brand-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{studentsByClass(c.id).length} students · {c.level}</p>
                </div>
                <div className="flex gap-2">
                  <Link href="/portal/teacher/attendance"><Button variant="outline">Mark Attendance</Button></Link>
                  <Link href="/portal/teacher/results"><Button variant="ghost">Scores</Button></Link>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link href="/portal/teacher/attendance"><Button variant="outline" className="w-full justify-start"><CheckSquare className="h-4 w-4" /> Mark Attendance</Button></Link>
            <Link href="/portal/teacher/assignments"><Button variant="outline" className="w-full justify-start"><ClipboardList className="h-4 w-4" /> Create Assignment</Button></Link>
            <Link href="/portal/teacher/results"><Button variant="outline" className="w-full justify-start"><FileText className="h-4 w-4" /> Enter Scores</Button></Link>
            <Link href="/portal/teacher/cbt"><Button variant="outline" className="w-full justify-start"><BookMarked className="h-4 w-4" /> CBT Questions</Button></Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Calendar className="h-4 w-4 inline mr-2 text-brand-700" />Today's Timetable</CardTitle></CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              <th className="text-left px-5 py-2.5">Time</th>
              <th className="text-left px-5 py-2.5">Class</th>
              <th className="text-left px-5 py-2.5">Subject</th>
              <th className="text-left px-5 py-2.5">Room</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {timetable.map((t, i) => (
                <tr key={i}><td className="px-5 py-3 font-medium">{t.time}</td><td className="px-5 py-3"><Badge tone="info">{t.class}</Badge></td><td className="px-5 py-3">{t.subject}</td><td className="px-5 py-3 text-slate-500">{t.room}</td></tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
