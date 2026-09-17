import { prisma, prismaBase } from "./prisma";
import { getSessionUser } from "./auth-helpers";
import { getCurrentSchool } from "./tenant";
import type { Prisma } from "@prisma/client";

interface AuditArgs {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  /** Override the actor — defaults to the current session user. */
  actor?: { id: string; name?: string; email?: string; role?: string };
}

/**
 * Record a sensitive action. Fire-and-forget — failures are logged but
 * never rolled back into the calling transaction (an audit failure
 * shouldn't block the user's actual operation).
 *
 * Actor identity is snapshotted at insert time so the trail survives
 * later User deletes.
 */
export async function auditLog(args: AuditArgs) {
  try {
    let actor = args.actor;
    if (!actor) {
      const sess = await getSessionUser();
      if (sess) {
        // Unscoped on purpose: the actor may be a platform admin (no school).
        const u = await prismaBase.user.findUnique({
          where: { id: sess.id },
          select: { id: true, name: true, email: true, role: true },
        });
        if (u) actor = { id: u.id, name: u.name, email: u.email, role: u.role };
      }
    }

    const data = {
      action: args.action,
      actorId: actor?.id,
      actorName: actor?.name,
      actorEmail: actor?.email,
      actorRole: actor?.role,
      targetType: args.targetType,
      targetId: args.targetId,
      metadata: args.metadata,
    };

    // Platform-level actions (no resolvable school) are recorded with a
    // null schoolId rather than tripping the tenant guard.
    const school = await getCurrentSchool();
    if (school) {
      await prisma.auditLog.create({ data });
    } else {
      await prismaBase.auditLog.create({ data: { ...data, schoolId: null } });
    }
  } catch (err) {
    console.error("[audit] failed to record", args.action, err);
  }
}
