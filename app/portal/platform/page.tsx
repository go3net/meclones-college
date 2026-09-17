import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function PlatformHome() {
  await requireRole("PLATFORM_ADMIN");
  redirect("/portal/platform/schools");
}
