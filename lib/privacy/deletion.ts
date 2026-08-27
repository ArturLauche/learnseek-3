import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  account,
  consentRecords,
  deletionRequests,
  session,
  user,
  userByokCredentials,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export async function processDeletionRequest(requestId: string) {
  const [row] = await db.select().from(deletionRequests).where(eq(deletionRequests.id, requestId)).limit(1);
  if (!row || row.status === "processed") return { ok: false, reason: "missing" };

  const userId = row.userId;
  await db.delete(session).where(eq(session.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db
    .update(userByokCredentials)
    .set({ revokedAt: new Date(), keyCiphertext: "revoked", updatedAt: new Date() })
    .where(eq(userByokCredentials.userId, userId));
  await db.insert(consentRecords).values({
    userId,
    kind: "account_deletion",
    granted: true,
    version: "privacy-v1",
  });
  await db
    .update(user)
    .set({
      email: `deleted-${userId.slice(0, 8)}@invalid.local`,
      name: "Deleted user",
      handle: null,
      status: "deleted",
      emailVerified: false,
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  await db
    .update(deletionRequests)
    .set({ status: "processed", processedAt: new Date() })
    .where(eq(deletionRequests.id, requestId));
  logger.info({ requestId, userId }, "account deletion processed");
  return { ok: true };
}
