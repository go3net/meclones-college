import { prisma } from "./prisma";
import { getSessionUser } from "./auth-helpers";
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
        const u = await prisma.user.findUnique({
          where: { id: sess.id },
          select: { id: true, name: true, email: true, role: true },
        });
        if (u) actor = { id: u.id, name: u.name, email: u.email, role: u.role };
      }
    }

    await prisma.auditLog.create({
      data: {
        action: args.action,
        actorId: actor?.id,
        actorName: actor?.name,
        actorEmail: actor?.email,
        actorRole: actor?.role,
        targetType: args.targetType,
        targetId: args.targetId,
        metadata: args.metadata,
      },
    });
  } catch (err) {
    console.error("[audit] failed to record", args.action, err);
  }
}
