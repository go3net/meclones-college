"use client";

import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge, Select, Toast, Label } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { updateStore, loadStore, pushWhatsApp } from "@/lib/store";
import { CLASSES, STUDENTS, teacherById, studentsByClass, parentById } from "@/lib/mock-data";
import { CheckSquare, Save } from "lucide-react";

type Status = "present" | "absent" | "late";

export default function TeacherAttendance() {
  const [user, setUser] = useState<any>(null);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    const u = currentUser();
    setUser(u);
    const t = u?.linkedId ? teacherById(u.linkedId) : null;
    if (t?.classes[0]) setClassId(t.classes[0]);
  }, []);

  if (!user) return null;
  const teacher = user.linkedId ? teacherById(user.linkedId) : undefined;
  const teacherClasses = teacher ? CLASSES.filter(c => teacher.classes.includes(c.id)) : [];
  const students = classId ? studentsByClass(classId) : [];

  const setStatus = (sid: string, s: Status) => setMarks(prev => ({ ...prev, [sid]: s }));
  const setAll = (s: Status) => setMarks(students.reduce((acc, st) => ({ ...acc, [st.id]: s }), {} as Record<string, Status>));

  const save = () => {
    let alertsSent = 0;
    updateStore(s => {
      for (const st of students) {
        const status = marks[st.id] || "present";
        s.attendance.unshift({
          id: "att-" + Date.now() + "-" + st.id,
          studentId: st.id,
          classId,
          date,
          status,
          markedBy: teacher!.id,
        });
        if (status === "absent" || status === "late") {
          const parent = parentById(st.parentId);
          if (parent) {
            s.whatsappLogs.unshift({
              id: "wa-" + Date.now() + "-" + st.id,
              to: parent.phone,
              recipientName: parent.name,
              trigger: status === "absent" ? "Student Absent" : "Student Late",
              message: `Dear ${parent.name}, ${st.name} was marked ${status.toUpperCase()} today (${date}). Please ensure ${st.gender === "M" ? "he" : "she"} attends regularly and on time. — Meclones College`,
              status: "sent",
              timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
            });
            alertsSent++;
          }
        }
      }
      return s;
    });
    setToast(`Attendance saved · ${alertsSent} WhatsApp alert${alertsSent === 1 ? "" : "s"} sent to parents.`);
    setMarks({});
  };

  return (
    <PortalShell role="teacher">
      <Toast message={toast} onClose={() => setToast("")} />
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Mark Attendance</h1>
      <p className="text-sm text-slate-500 mb-6">Mark each student. Parents of absent/late students get automatic WhatsApp alerts.</p>

      <Card className="mb-4">
        <CardBody>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <div><Label>Class</Label>
              <Select value={classId} onChange={e => setClassId(e.target.value)}>
                {teacherClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div><Label>Date</Label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAll("present")}>Mark all present</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{students.length} students</CardTitle>
          <Button variant="gold" onClick={save} disabled={students.length === 0}><Save className="h-4 w-4" /> Save Attendance</Button>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-5 py-2.5">Student</th>
                <th className="text-left px-5 py-2.5">Adm No.</th>
                <th className="text-left px-5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => {
                const status = marks[s.id] || "present";
                return (
                  <tr key={s.id}>
                    <td className="px-5 py-3"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">{s.name.split(" ").map(n => n[0]).join("")}</div><p className="font-medium">{s.name}</p></div></td>
                    <td className="px-5 py-3 text-slate-500">{s.admissionNo}</td>
                    <td className="px-5 py-3">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                        {(["present", "late", "absent"] as Status[]).map(opt => (
                          <button key={opt} onClick={() => setStatus(s.id, opt)} className={`px-3 py-1 text-xs font-medium rounded ${status === opt ? (opt === "present" ? "bg-emerald-600 text-white" : opt === "late" ? "bg-amber-500 text-white" : "bg-red-600 text-white") : "text-slate-600 hover:bg-slate-50"}`}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
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
