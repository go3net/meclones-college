"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Select, Label, Badge, Toast } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { teacherById, classById, studentsByClass, subjectById } from "@/lib/mock-data";
import { Save } from "lucide-react";

export default function TeacherScoreEntry() {
  const [user, setUser] = useState<any>(null);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [scores, setScores] = useState<Record<string, { ca: string; exam: string }>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = currentUser(); setUser(u);
    const t = u ? teacherById(u.linkedId) : null;
    if (t) { setClassId(t.classes[0]); setSubjectId(t.subjects[0]); }
  }, []);

  if (!user) return null;
  const teacher = teacherById(user.linkedId);
  const students = classId ? studentsByClass(classId) : [];

  const grade = (total: number) => total >= 75 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";

  return (
    <PortalShell role="teacher">
      <Toast message={toast} onClose={() => setToast("")} />
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Score Entry</h1>
      <p className="text-sm text-slate-500 mb-6">Enter CA (out of 40) and exam (out of 60) scores. System auto-calculates total & grade.</p>

      <Card className="mb-4">
        <CardBody>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Class</Label>
              <Select value={classId} onChange={e => setClassId(e.target.value)}>
                {teacher?.classes.map(c => { const cls = classById(c); return <option key={c} value={c}>{cls?.name}</option>; })}
              </Select>
            </div>
            <div><Label>Subject</Label>
              <Select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                {teacher?.subjects.map(s => { const sj = subjectById(s); return <option key={s} value={s}>{sj?.name}</option>; })}
              </Select>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{students.length} students · {subjectById(subjectId)?.name}</CardTitle>
          <Button variant="gold" onClick={() => setToast("Scores saved. Awaiting admin approval before publishing.")}><Save className="h-4 w-4" /> Save & Submit for Approval</Button>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
              <th className="text-left px-5 py-2.5">Student</th>
              <th className="text-center px-5 py-2.5">CA / 40</th>
              <th className="text-center px-5 py-2.5">Exam / 60</th>
              <th className="text-center px-5 py-2.5">Total</th>
              <th className="text-center px-5 py-2.5">Grade</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => {
                const sc = scores[s.id] || { ca: "", exam: "" };
                const ca = Number(sc.ca) || 0; const exam = Number(sc.exam) || 0;
                const total = ca + exam;
                return (
                  <tr key={s.id}>
                    <td className="px-5 py-2 font-medium">{s.name}</td>
                    <td className="px-5 py-2"><input type="number" min={0} max={40} value={sc.ca} onChange={e => setScores({ ...scores, [s.id]: { ...sc, ca: e.target.value } })} className="w-20 text-center rounded border border-slate-300 px-2 py-1" /></td>
                    <td className="px-5 py-2"><input type="number" min={0} max={60} value={sc.exam} onChange={e => setScores({ ...scores, [s.id]: { ...sc, exam: e.target.value } })} className="w-20 text-center rounded border border-slate-300 px-2 py-1" /></td>
                    <td className="px-5 py-2 text-center font-semibold">{total || "—"}</td>
                    <td className="px-5 py-2 text-center">{total > 0 && <Badge tone={total >= 75 ? "success" : total >= 50 ? "info" : "warning"}>{grade(total)}</Badge>}</td>
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
