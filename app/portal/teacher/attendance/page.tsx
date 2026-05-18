import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { getCurrentTeacher, getActiveContext } from "@/lib/auth-helpers";
import { CheckSquare, Save, AlertCircle } from "lucide-react";
import { markAttendance } from "./actions";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

type SearchParams = { classId?: string; date?: string };

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function TeacherAttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const teacher = await getCurrentTeacher();
  const { term } = await getActiveContext();

  // All classes this teacher can mark for: form-teacher of + assigned to.
  const myClassIds = Array.from(new Set([
    ...teacher.classTeacherOf.map(c => c.id),
    ...teacher.classes.map(c => c.class.id),
  ]));
  const myClasses = await prisma.class.findMany({
    where: { id: { in: myClassIds } },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });

  if (myClasses.length === 0) {
    return (
      <PortalShell role="teacher">
        <Card><CardBody className="text-center py-12">
          <AlertCircle className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="font-medium text-slate-700">No classes assigned</p>
          <p className="text-sm text-slate-500 mt-1">Ask the school admin to assign you to a class.</p>
        </CardBody></Card>
      </PortalShell>
    );
  }

  const selectedClassId = searchParams.classId && myClasses.some(c => c.id === searchParams.classId)
    ? searchParams.classId
    : myClasses[0].id;
  const selectedClass = myClasses.find(c => c.id === selectedClassId)!;
  const date = searchParams.date ?? todayISO();
  const dateObj = new Date(date + "T00:00:00.000Z");

  const [students, existingRecords] = await Promise.all([
    prisma.student.findMany({
      where: { classId: selectedClassId },
      include: { user: { select: { name: true } } },
      orderBy: { admissionNumber: "asc" },
    }),
    prisma.attendance.findMany({
      where: { classId: selectedClassId, date: dateObj },
      select: { studentId: true, status: true },
    }),
  ]);

  const existingByStudent = new Map(existingRecords.map(r => [r.studentId, r.status]));

  return (
    <PortalShell role="teacher">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900">Mark Attendance</h1>
        <p className="text-sm text-slate-500">
          {term ? `${term.name.charAt(0)}${term.name.slice(1).toLowerCase()} Term · ` : ""}
          Welcome, {teacher.user.name}
        </p>
      </div>

      <form className="mb-5 flex flex-wrap items-end gap-3" action="">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Class</label>
          <select
            name="classId"
            defaultValue={selectedClassId}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {myClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.arm}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg text-sm font-medium">Load</button>
      </form>

      <form action={markAttendance}>
        <input type="hidden" name="classId" value={selectedClassId} />
        <input type="hidden" name="date" value={date} />

        <Card>
          <CardHeader>
            <CardTitle>{selectedClass.name}{selectedClass.arm} · {dateFmt.format(dateObj)}</CardTitle>
            <Badge tone="neutral">{students.length} students</Badge>
          </CardHeader>
          <CardBody className="p-0">
            {students.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">No students in this class yet.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Student</th>
                    <th className="text-left px-4 py-2.5 font-medium">Adm #</th>
                    <th className="text-center px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const current = existingByStudent.get(s.id) ?? "PRESENT";
                    return (
                      <tr key={s.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{s.user.name}</td>
                        <td className="px-4 py-2.5 font-mono text-[12px] text-slate-500">{s.admissionNumber}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 justify-center">
                            {[
                              { value: "PRESENT", label: "P", tone: "bg-emerald-100 text-emerald-700 ring-emerald-300" },
                              { value: "LATE", label: "L", tone: "bg-amber-100 text-amber-700 ring-amber-300" },
                              { value: "ABSENT", label: "A", tone: "bg-rose-100 text-rose-700 ring-rose-300" },
                            ].map(opt => (
                              <label key={opt.value} className="cursor-pointer">
                                <input
                                  type="radio"
                                  name={`status:${s.id}`}
                                  value={opt.value}
                                  defaultChecked={current === opt.value}
                                  className="peer sr-only"
                                />
                                <span className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-xs font-bold ${opt.tone} peer-checked:ring-2 opacity-50 peer-checked:opacity-100 transition`}>
                                  {opt.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            <CheckSquare className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
            P = Present · L = Late · A = Absent. Existing marks are pre-filled.
          </p>
          <button type="submit" className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
            <Save className="h-4 w-4" /> Save attendance
          </button>
        </div>
      </form>
    </PortalShell>
  );
}
