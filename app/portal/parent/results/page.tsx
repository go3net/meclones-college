"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Badge, Button, Empty } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { studentsByParent, classById, subjectById } from "@/lib/mock-data";
import { Download, Printer } from "lucide-react";

export default function ParentResults() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(currentUser()); }, []);
  const store = loadStore();
  if (!user) return null;
  const children = studentsByParent(user.linkedId);
  const results = store.results.filter(r => children.some(c => c.id === r.studentId) && r.status === "published");

  return (
    <PortalShell role="parent">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Academic Results</h1>
      <p className="text-sm text-slate-500 mb-6">Published results for your child(ren). Download or print as PDF.</p>

      {results.length === 0 ? <Empty title="No published results yet" /> : results.map(r => {
        const child = children.find(c => c.id === r.studentId);
        const total = r.subjects.reduce((s, x) => s + x.total, 0);
        const avg = Math.round(total / r.subjects.length);
        return (
          <Card key={r.id} className="mb-4">
            <CardHeader>
              <div>
                <CardTitle>{child?.name} · {classById(child?.classId || "")?.name}</CardTitle>
                <p className="text-xs text-slate-500">{r.term} · {r.subjects.length} subjects</p>
              </div>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                <div className="rounded-lg bg-brand-50 p-3"><p className="text-xs text-slate-500">Position</p><p className="text-xl font-bold text-brand-900">{r.position}</p></div>
                <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-slate-500">Average</p><p className="text-xl font-bold text-emerald-700">{avg}%</p></div>
                <div className="rounded-lg bg-gold-50 p-3"><p className="text-xs text-slate-500">Total</p><p className="text-xl font-bold text-gold-700">{total}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2">Subject</th>
                      <th className="text-center px-3 py-2">CA /40</th>
                      <th className="text-center px-3 py-2">Exam /60</th>
                      <th className="text-center px-3 py-2">Total /100</th>
                      <th className="text-center px-3 py-2">Grade</th>
                      <th className="text-left px-3 py-2">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.subjects.map((s, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{subjectById(s.subjectId)?.name}</td>
                        <td className="px-3 py-2 text-center">{s.ca}</td>
                        <td className="px-3 py-2 text-center">{s.exam}</td>
                        <td className="px-3 py-2 text-center font-semibold">{s.total}</td>
                        <td className="px-3 py-2 text-center"><Badge tone={s.grade === "A" ? "success" : s.grade === "B" ? "info" : s.grade === "C" ? "warning" : "danger"}>{s.grade}</Badge></td>
                        <td className="px-3 py-2 text-slate-600">{s.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700 text-xs uppercase mb-1">Teacher's Comment</p>
                  <p className="text-slate-700">{r.teacherComment}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="font-semibold text-slate-700 text-xs uppercase mb-1">Principal's Comment</p>
                  <p className="text-slate-700">{r.principalComment || <em>Pending</em>}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        );
      })}
    </PortalShell>
  );
}
