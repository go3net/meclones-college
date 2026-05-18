"use client";
import { useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Label, Textarea, Toast, Badge } from "@/components/ui";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

interface Q { question: string; options: string[]; correct: number; }

export default function TeacherCBT() {
  const [questions, setQuestions] = useState<Q[]>([
    { question: "Which of these is a quadratic equation?", options: ["x + 2 = 5", "x² + 3x + 2 = 0", "2x = 10", "5 = 5"], correct: 1 },
    { question: "What is the value of √64?", options: ["6", "7", "8", "9"], correct: 2 },
  ]);
  const [toast, setToast] = useState("");

  const addQ = () => setQuestions(q => [...q, { question: "", options: ["", "", "", ""], correct: 0 }]);
  const removeQ = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i));
  const update = (i: number, q: Q) => setQuestions(qs => qs.map((x, idx) => idx === i ? q : x));

  return (
    <PortalShell role="teacher">
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">CBT Question Bank</h1>
          <p className="text-sm text-slate-500">Create multiple-choice questions for online assessment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addQ}><Plus className="h-4 w-4" /> Add Question</Button>
          <Button variant="gold" onClick={() => setToast(`${questions.length} questions saved to question bank.`)}><CheckCircle2 className="h-4 w-4" /> Publish Test</Button>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>Question {i + 1}</CardTitle>
              <button onClick={() => removeQ(i)} className="text-red-600 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
            </CardHeader>
            <CardBody className="space-y-3">
              <div><Label>Question</Label><Textarea value={q.question} onChange={e => update(i, { ...q, question: e.target.value })} /></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {q.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${i}`} checked={q.correct === j} onChange={() => update(i, { ...q, correct: j })} className="h-4 w-4" />
                    <Input value={opt} onChange={e => update(i, { ...q, options: q.options.map((o, oi) => oi === j ? e.target.value : o) })} placeholder={`Option ${j + 1}`} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-emerald-700">✓ Correct: {q.options[q.correct]}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PortalShell>
  );
}
