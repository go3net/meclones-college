import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import { requireRole } from "@/lib/auth-helpers";
import { importStudentsCsv } from "./actions";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Download, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { ok?: string; err?: string; firstErr?: string; error?: string };

const TEMPLATE = [
  "firstName,lastName,gender,dob,class,arm,parentName,parentEmail,parentPhone,parentRelation",
  "Chinedu,Eze,M,2008-04-12,SS 3,A,Mr Eze,eze.family@example.com,+2348061110007,Father",
  "Ada,Bello,F,2009-09-22,SS 2,A,Dr Aisha Bello,aisha@example.com,+2348061110002,Mother",
  "Funmi,Adesina,F,2012-06-09,JSS 2,A,Mrs Adesina,funmi.adesina@example.com,+2348061110004,Mother",
].join("\n");

const TEMPLATE_DATA_URL = `data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`;

export default async function ImportStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole(["ADMIN", "DIRECTOR", "SUPER_ADMIN"]);

  const okCount = Number(searchParams.ok ?? 0);
  const errCount = Number(searchParams.err ?? 0);

  return (
    <PortalShell role="school_admin">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/admin/students" className="text-slate-500 hover:text-brand-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Bulk import students</h1>
          <p className="text-sm text-slate-500">Onboard a whole class (or several) in seconds with a CSV from Excel/Google Sheets.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}
      {(okCount > 0 || errCount > 0) && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm border flex items-start gap-2 ${errCount === 0 ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-900"}`}>
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <div>
            <p>Imported <strong>{okCount}</strong> student{okCount === 1 ? "" : "s"}{errCount > 0 && <>, <strong className="text-rose-700">{errCount}</strong> row{errCount === 1 ? "" : "s"} failed</>}.</p>
            {searchParams.firstErr && <p className="text-xs mt-0.5">First error: {decodeURIComponent(searchParams.firstErr)}</p>}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle><Upload className="h-4 w-4 inline mr-1" /> Upload CSV</CardTitle></CardHeader>
          <CardBody>
            <form action={importStudentsCsv} encType="multipart/form-data" className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">CSV file</label>
                <input
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  required
                  className="mt-1 block w-full text-sm border border-slate-300 rounded-lg p-2 file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:text-brand-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                />
                <p className="text-[11px] text-slate-500 mt-1">Max 1 MB. UTF-8 plain text.</p>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
                <p className="font-semibold mb-1.5">Required columns (header row, lowercase):</p>
                <code className="block font-mono bg-white border border-slate-200 rounded p-2 text-[11px] whitespace-pre-wrap break-all">
                  firstName,lastName,gender,dob,class,arm,parentName,parentEmail,parentPhone,parentRelation
                </code>
                <ul className="mt-2 list-disc list-inside space-y-0.5">
                  <li><code>firstName</code>, <code>lastName</code>, <code>class</code>, <code>arm</code> are required</li>
                  <li><code>class</code> must match an existing class name (e.g. <code>JSS 1</code>, <code>SS 3</code>) and <code>arm</code> the arm letter</li>
                  <li><code>gender</code>: <code>M</code> or <code>F</code> (or <code>MALE</code>/<code>FEMALE</code>)</li>
                  <li><code>dob</code>: ISO date <code>YYYY-MM-DD</code> (optional)</li>
                  <li>Parent fields are optional — if filled, we create a parent account and link the child</li>
                </ul>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <a
                  href={TEMPLATE_DATA_URL}
                  download="meclones-students-template.csv"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV template
                </a>
                <Button type="submit" variant="gold"><Upload className="h-4 w-4" /> Import</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle><FileSpreadsheet className="h-4 w-4 inline mr-1" /> How it works</CardTitle></CardHeader>
          <CardBody className="text-sm text-slate-700 space-y-2">
            <p>For each row in your CSV we:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Look up the class by name + arm</li>
              <li>Auto-generate an admission number <code>MCL/&lt;class&gt;/2526/&lt;seq&gt;</code></li>
              <li>Create a student User account with the default password (<code className="bg-slate-100 px-1 rounded">Meclones123!</code>)</li>
              <li>If parent fields are present, create / find a Parent account and link it</li>
            </ol>
            <p className="text-xs text-slate-500 pt-2">Rerunning with the same parent email is safe — we upsert and link the new child to the existing parent.</p>
            <Badge tone="warning">Tip: change the default password under "Staff & Accounts" after onboarding.</Badge>
          </CardBody>
        </Card>
      </div>
    </PortalShell>
  );
}
