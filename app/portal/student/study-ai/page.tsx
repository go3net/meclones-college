"use client";
import { useRef, useEffect, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button } from "@/components/ui";
import { Brain, Send, Sparkles, BookOpen } from "lucide-react";

interface Msg { from: "me" | "ai"; text: string; }

const PROMPTS = [
  "Explain photosynthesis simply",
  "Help me revise for WAEC Maths",
  "What is the difference between mitosis and meiosis?",
  "Give me 5 practice questions on quadratic equations",
  "Summarize Things Fall Apart chapter 1",
  "How do I write a good essay?",
];

export default function StudyAI() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "ai", text: "Hi! I'm your Meclones Study Assistant 🎓 Ask me anything academic — I can explain concepts, give practice questions, summarize texts, or help you revise." },
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const ask = (q: string) => {
    setMsgs(m => [...m, { from: "me", text: q }]);
    setInput("");
    setTimeout(() => setMsgs(m => [...m, { from: "ai", text: answer(q.toLowerCase()) }]), 800);
  };

  return (
    <PortalShell role="student">
      <h1 className="text-2xl font-bold text-brand-900 mb-1 flex items-center gap-2"><Brain className="h-6 w-6 text-brand-700" /> Study Assistant</h1>
      <p className="text-sm text-slate-500 mb-4">Get help with any subject — explanations, summaries, practice questions.</p>

      <Card>
        <CardHeader><CardTitle>Chat</CardTitle><Sparkles className="h-4 w-4 text-gold-600" /></CardHeader>
        <CardBody className="p-0">
          <div className="h-[440px] overflow-y-auto p-5 space-y-3 bg-slate-50">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed ${m.from === "me" ? "bg-brand-700 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm"}`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {PROMPTS.map(p => (
                <button key={p} onClick={() => ask(p)} className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 hover:bg-brand-50 text-slate-700">{p}</button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (input.trim()) ask(input); }} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a study question..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <Button type="submit"><Send className="h-4 w-4" /></Button>
            </form>
          </div>
        </CardBody>
      </Card>
      <p className="text-xs text-slate-400 mt-3"><BookOpen className="h-3 w-3 inline mr-1" />Demo responses. Production uses Claude / OpenAI fine-tuned on the WAEC, JAMB & Cambridge curriculum.</p>
    </PortalShell>
  );
}

function answer(q: string): string {
  if (/photosynth/.test(q)) {
    return `🌱 Photosynthesis explained simply:

Photosynthesis is how green plants make their food using sunlight.

The recipe:
• Sunlight (energy)
• Water (from roots)
• Carbon dioxide (from air)
• Chlorophyll (the green stuff in leaves)

The output:
• Glucose (food for the plant)
• Oxygen (which we breathe)

Equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (under sunlight + chlorophyll)

Practice questions:
1. Where in the plant cell does photosynthesis occur?
2. What is the function of chlorophyll?
3. Why are leaves usually green?`;
  }
  if (/waec.*math|math.*waec|revise.*math/.test(q)) {
    return `📐 WAEC Maths Revision Plan (2 weeks)

Week 1 — Algebra & Numbers:
• Day 1: Indices, logarithms
• Day 2: Quadratic equations
• Day 3: Sequences & series
• Day 4: Variation & inequalities
• Day 5: Mock test (40 questions)

Week 2 — Geometry & Stats:
• Day 6: Plane geometry, circle theorems
• Day 7: Trigonometry
• Day 8: Mensuration
• Day 9: Statistics & probability
• Day 10: Full mock paper

Tip: WAEC repeats topic patterns. Past questions are gold. I recommend solving 5 past papers under timed conditions.`;
  }
  if (/mitosis|meiosis/.test(q)) {
    return `🧬 Mitosis vs Meiosis

Mitosis:
• Body cell division (somatic cells)
• 1 division → 2 identical cells
• Same chromosome number (diploid → diploid)
• Purpose: growth, repair, replacement

Meiosis:
• Sex cell division (gametes)
• 2 divisions → 4 cells
• Halves the chromosome number (diploid → haploid)
• Purpose: produces sperm and egg cells

Memory trick: Mit-ONE-sis (one division), Mei-TWO-sis (two divisions).`;
  }
  if (/quadratic/.test(q)) {
    return `📐 Quadratic Equations — 5 Practice Questions

1. Solve x² – 7x + 12 = 0
2. Find the roots of 2x² + 5x – 3 = 0
3. Using the quadratic formula, solve x² + 2x – 8 = 0
4. Form a quadratic equation whose roots are 4 and –3
5. For what value of k will x² + kx + 9 = 0 have equal roots?

Try them, then ask me to walk through any solution.`;
  }
  if (/things fall apart/.test(q)) {
    return `📖 Things Fall Apart — Chapter 1 Summary

The chapter introduces Okonkwo, a respected warrior of Umuofia in pre-colonial Igboland. He is famous for throwing Amalinze the Cat in a legendary wrestling match.

Key points:
• Okonkwo is hardworking, proud, and feared
• His father Unoka was the opposite — lazy, indebted, mocked
• Okonkwo is shaped by shame about his father; he overcompensates with strength
• Umuofia is a clan governed by elders, masquerades, and the ancestors
• Okonkwo cares for Ikemefuna, a boy brought as a peace settlement

Theme to watch: how Okonkwo's fear of weakness drives his every action.`;
  }
  if (/essay|writing/.test(q)) {
    return `✍️ How to write a strong essay

Structure (the PEEL method):
• Point — state your idea
• Evidence — support it with a fact, quote, or example
• Explanation — explain why it matters
• Link — connect back to the question

5-paragraph essay:
1. Introduction with a thesis statement
2. Body paragraph 1 (strongest argument)
3. Body paragraph 2
4. Body paragraph 3
5. Conclusion that restates your thesis

Tips:
• One idea per paragraph
• Use connectors: however, therefore, furthermore
• Read it aloud before you submit — your ear catches errors your eyes miss.`;
  }
  return `Great question. In the production app this would be answered by Claude / OpenAI with full curriculum context. For this demo, try one of the quick prompts — I've prepared detailed responses for those.`;
}
