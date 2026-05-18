"use client";
import { useEffect, useRef, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { loadStore } from "@/lib/store";
import { studentsByParent, classById, formatNaira } from "@/lib/mock-data";
import { Send, Sparkles, Brain } from "lucide-react";

interface Msg { from: "me" | "ai"; text: string; }

const QUICK = [
  "What is my child's fee balance?",
  "Did my child attend school today?",
  "When is the next exam?",
  "Show my child's result",
  "How do I apply for admission?",
  "I want to book a visit",
];

export default function ParentChatbot() {
  const [user, setUser] = useState<any>(null);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "ai", text: "Hi! I'm the Meclones AI Parent Assistant. Ask me about your child's fees, attendance, results, or anything else. You can also tap the quick questions below." },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUser(currentUser()); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  if (!user) return null;
  const children = studentsByParent(user.linkedId);
  const store = loadStore();

  const ask = (q: string) => {
    setMsgs(m => [...m, { from: "me", text: q }]);
    setInput("");
    setTimeout(() => {
      const reply = answer(q.toLowerCase(), children, store);
      setMsgs(m => [...m, { from: "ai", text: reply }]);
    }, 600);
  };

  return (
    <PortalShell role="parent">
      <h1 className="text-2xl font-bold text-brand-900 mb-1 flex items-center gap-2"><Brain className="h-6 w-6 text-brand-700" /> AI Parent Chatbot</h1>
      <p className="text-sm text-slate-500 mb-4">Ask anything about your child's school life. Responses use real data from your portal.</p>

      <Card>
        <CardHeader><CardTitle>Conversation</CardTitle><span className="text-xs text-emerald-600 font-medium flex items-center gap-1">● Online</span></CardHeader>
        <CardBody className="p-0">
          <div className="h-[420px] overflow-y-auto p-5 space-y-3 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.from === "me" ? "bg-brand-700 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => ask(q)} className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700">
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (input.trim()) ask(input); }} className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a question..."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <Button type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-slate-400 mt-3 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Demo responses · Production uses Claude / OpenAI with school data context.</p>
    </PortalShell>
  );
}

function answer(q: string, children: any[], store: any): string {
  const child = children[0];
  if (/fee|balance|owe|pay/.test(q)) {
    const inv = store.invoices.find((i: any) => i.studentId === child.id);
    if (!inv) return "No active invoice on file.";
    const bal = inv.amount - inv.paid;
    return bal === 0
      ? `Great news — ${child.name}'s ${inv.term} fees are fully paid. Total: ${formatNaira(inv.amount)}.`
      : `${child.name} has an outstanding balance of ${formatNaira(bal)} on the ${inv.term} invoice (total ${formatNaira(inv.amount)}). Due ${inv.dueDate}. You can pay online from Fees & Payments.`;
  }
  if (/attend|today|present|absent|late/.test(q)) {
    const recs = store.attendance.filter((a: any) => a.studentId === child.id).sort((a: any, b: any) => b.date.localeCompare(a.date));
    if (!recs.length) return "No attendance record on file yet.";
    const latest = recs[0];
    return `${child.name}'s most recent attendance (${latest.date}) is marked: ${latest.status.toUpperCase()}.`;
  }
  if (/exam|test|cbt/.test(q)) {
    return "The next mid-term examinations begin Monday, June 9, 2026. The full exam timetable is in the school calendar on your portal.";
  }
  if (/result|grade|position|score/.test(q)) {
    const r = store.results.find((x: any) => x.studentId === child.id && x.status === "published");
    if (!r) return "No published results yet — check back after the term ends.";
    const avg = Math.round(r.subjects.reduce((s: number, x: any) => s + x.total, 0) / r.subjects.length);
    return `${child.name} placed ${r.position} in class for ${r.term} with an average of ${avg}%. Teacher's comment: "${r.teacherComment}"`;
  }
  if (/admission|apply/.test(q)) {
    return "You can start a new admission application at /apply. Applications take ~10 minutes and you'll get WhatsApp confirmation instantly.";
  }
  if (/visit|tour/.test(q)) {
    return "I can help you book a visit. Visits happen Tuesdays & Thursdays at 10am, 11am, or 2pm. Go to /book-visit to schedule.";
  }
  if (/timetable|schedule/.test(q)) {
    return `${child.name}'s class timetable is on the Student Dashboard. Monday begins with Mathematics at 8:00am.`;
  }
  if (/uniform/.test(q)) {
    return "The Meclones uniform is white shirt, navy trousers/skirt with house badge. The full uniform policy is in Parent Resources → Parent Handbook.";
  }
  return `I can help with fees, attendance, results, exams, admissions, and visits. Try one of the quick questions, or rephrase your question for more detail. In production this assistant is powered by Claude / OpenAI with full access to your child's data.`;
}
