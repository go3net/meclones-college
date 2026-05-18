"use client";
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Modal, Input, Label, Select, Textarea, Badge, Toast } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore, updateStore } from "@/lib/store";
import { teacherById, subjectById, classById, CLASSES, SUBJECTS } from "@/lib/mock-data";
import { Plus, Calendar, Users } from "lucide-react";

export default function TeacherAssignments() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState({ title: "", classId: "", subjectId: "", dueDate: "", description: "" });

  useEffect(() => { setUser(currentUser()); }, []);
  if (!user) return null;
  const teacher = teacherById(user.linkedId);
  const store = loadStore();
  const mine = store.assignments.filter(a => a.teacherId === teacher?.id);

  const create = () => {
    updateStore(s => {
      s.assignments.unshift({
        id: "asg-" + Date.now(),
        teacherId: teacher!.id,
        ...form,
        submissions: [],
      });
    });
    setOpen(false);
    setForm({ title: "", classId: "", subjectId: "", dueDate: "", description: "" });
    setToast("Assignment created and notification sent to class.");
    setRefresh(r => r + 1);
  };

  return (
    <PortalShell role="teacher">
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Assignments</h1>
          <p className="text-sm text-slate-500">Create and review assignments for your classes.</p>
        </div>
        <Button variant="gold" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Assignment</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {mine.map(a => (
          <Card key={a.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-2">
                <Badge tone="info">{classById(a.classId)?.name}</Badge>
                <span className="text-xs text-slate-500"><Calendar className="h-3 w-3 inline" /> Due {a.dueDate}</span>
              </div>
              <h3 className="font-semibold text-brand-900">{a.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{a.description}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500"><Users className="h-3 w-3 inline" /> {a.submissions.length} submissions</span>
                <Button variant="outline" className="text-xs px-3 py-1.5">View</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Assignment" footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button variant="gold" onClick={create} disabled={!form.title || !form.classId}>Create</Button></>}>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Quadratic Equations Problem Set" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Class</Label>
              <Select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                <option value="">Select</option>
                {teacher?.classes.map(c => { const cls = classById(c); return <option key={c} value={c}>{cls?.name}</option>; })}
              </Select>
            </div>
            <div><Label>Subject</Label>
              <Select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Select</option>
                {teacher?.subjects.map(s => { const sj = subjectById(s); return <option key={s} value={s}>{sj?.name}</option>; })}
              </Select>
            </div>
          </div>
          <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          <div><Label>Description / Instructions</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        </div>
      </Modal>
    </PortalShell>
  );
}
