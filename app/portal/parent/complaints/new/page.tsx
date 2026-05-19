import Link from "next/link";
import { PortalShell } from "@/components/PortalShell";
import { Card, CardBody, CardHeader, CardTitle, Button, Input, Textarea, Select, Label } from "@/components/ui";
import { requireRole } from "@/lib/auth-helpers";
import { submitComplaint } from "../actions";
import { AlertCircle, ArrowLeft, Send } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = { error?: string };

export default async function NewComplaintPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("PARENT");

  return (
    <PortalShell role="parent">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/portal/parent/complaints" className="text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-900">New Complaint</h1>
          <p className="text-sm text-slate-500">Share feedback or report an issue. The school will respond within 48 hours.</p>
        </div>
      </div>

      {searchParams.error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Submit a complaint or feedback</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={submitComplaint} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input id="subject" name="subject" required minLength={3} placeholder="Brief one-line description" />
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select id="category" name="category" defaultValue="GENERAL">
                <option value="ACADEMIC">Academic</option>
                <option value="FEES">Fees & Payments</option>
                <option value="STAFF">Staff</option>
                <option value="FACILITY">Facility</option>
                <option value="TRANSPORT">Transport</option>
                <option value="GENERAL">General</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="body">Details *</Label>
              <Textarea id="body" name="body" required minLength={10} rows={6} placeholder="Please describe the issue, when it occurred, who was involved, and what outcome you'd like." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/portal/parent/complaints"><Button variant="outline" type="button">Cancel</Button></Link>
              <Button type="submit" variant="gold">Submit <Send className="h-4 w-4" /></Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </PortalShell>
  );
}
