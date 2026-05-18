"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, StatCard, Badge, Button } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { studentById, classById, subjectById } from "@/lib/mock-data";
import { Brain, ClipboardList, FileText, BookMarked, Calendar, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;
  const student = studentById(user.linkedId);
  const myClass = classById(student?.classId || "");
  const myAssignments = store.assignments.filter(a => a.classId === student?.classId);
  const myResult = store.results.find(r => r.studentId === student?.id && r.status === "published");
  const avg = myResult ? Math.round(myResult.subjects.reduce((s, x) => s + x.total, 0) / myResult.subjects.length) : 0;

  return (
    <PortalShell role="student">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Hi {student?.name.split(" ")[0]} 👋</h1>
      <p className="text-sm text-slate-500 mb-6">{myClass?.name} · Admission No. {student?.admissionNo}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Assignments" value={myAssignments.length} hint="active" icon={<ClipboardList className="h-5 w-5" />} accent="brand" />
        <StatCard label="Average" value={`${avg || "—"}%`} hint={myResult?.term || ""} icon={<FileText className="h-5 w-5" />} accent="emerald" />
        <StatCard label="Position" value={myResult?.position || "—"} hint="in class" icon={<FileText className="h-5 w-5" />} accent="gold" />
        <StatCard label="Subjects" value={myResult?.subjects.length || "—"} icon={<BookOpen className="h-5 w-5" />} accent="sky" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Active Assignments</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {myAssignments.map(a => (
              <div key={a.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-lg">
                <div>
                  <Badge tone="info" className="mb-1">{subjectById(a.subjectId)?.name}</Badge>
                  <p className="font-semibold text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">Due {a.dueDate}</p>
                </div>
                <Button variant="outline" className="text-xs">Submit</Button>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Access</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <Link href="/portal/student/study-ai"><Button variant="outline" className="w-full justify-start"><Brain className="h-4 w-4" /> Study AI</Button></Link>
            <Link href="/portal/student/cbt"><Button variant="outline" className="w-full justify-start"><BookMarked className="h-4 w-4" /> Take CBT</Button></Link>
            <Link href="/portal/student/elibrary"><Button variant="outline" className="w-full justify-start"><BookOpen className="h-4 w-4" /> E-Library</Button></Link>
            <Link href="/portal/student/results"><Button variant="outline" className="w-full justify-start"><FileText className="h-4 w-4" /> My Results</Button></Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle><Calendar className="h-4 w-4 inline mr-2 text-brand-700" />This Week</CardTitle></CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
              <div key={d} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold text-brand-900 text-xs uppercase">{d}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>8:00 — Maths</p>
                  <p>9:30 — English</p>
                  <p>11:00 — {["Biology", "Physics", "Chemistry", "Civic", "Computer"][i]}</p>
                  <p>13:00 — {["French", "Lit", "Maths", "Biology", "Sports"][i]}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
