"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

interface Props {
  /** New display name fetched from the DB after the server action ran. */
  name: string;
  /** New profile photo URL (or null) after the server action ran. */
  image: string | null;
}

/**
 * Drops into the profile page below the form. When the URL has
 * `?updated=1` (set by the server action's redirect after a successful
 * save), this calls `useSession().update()` so the JWT-backed session
 * cookie picks up the new name + image without a sign-out round-trip.
 *
 * Idempotent — we only fire once per mount via a ref guard.
 */
export function ProfileSessionRefresher({ name, image }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const { update } = useSession();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (params.get("updated") !== "1") return;
    firedRef.current = true;

    // Merge new display values into the JWT via the `update` trigger.
    // The auth.config.ts jwt callback handles the trigger === "update" branch.
    update({ name, image }).catch(err => console.error("[session-refresh] failed", err));

    // Drop the ?updated=1 query so a manual refresh doesn't re-fire.
    const sp = new URLSearchParams(params.toString());
    sp.delete("updated");
    const qs = sp.toString();
    router.replace(qs ? `/portal/me/profile?${qs}` : "/portal/me/profile", { scroll: false });
  }, [params, update, name, image, router]);

  return null;
}
