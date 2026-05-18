import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/auth.config";

// /portal/me — auth-required forwarder. After login we land here and bounce
// the user to their role's home dashboard. Middleware already enforces auth.
export default async function PortalMePage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role) redirect("/portal/login");
  redirect(ROLE_HOME[role] ?? "/portal/login");
}
