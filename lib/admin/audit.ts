import { db } from "@/lib/db";
import { administratorActions, auditEvents } from "@/lib/db/schema";

export async function recordAdminAction(params: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  confirmed: boolean;
}) {
  const [action] = await db
    .insert(administratorActions)
    .values({
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload ?? {},
      confirmed: params.confirmed,
    })
    .returning();
  await db.insert(auditEvents).values({
    actorUserId: params.actorUserId,
    actorType: "admin",
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: { confirmed: params.confirmed, ...(params.payload ?? {}) },
  });
  return action;
}
