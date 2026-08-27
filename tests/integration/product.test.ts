import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  appeals,
  contentItems,
  saves,
  user,
  userByokCredentials,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { encryptSecret, lastFour } from "@/lib/crypto/secrets";
import { getEnv } from "@/lib/env";
import { resolveProviderCredentials } from "@/lib/ai/credentials";
import { moderateSubmission } from "@/lib/moderation/pipeline";
import { recordAdminAction } from "@/lib/admin/audit";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("product integration", () => {
  it("registers a user, saves an item, reports, moderates, and appeals", async () => {
    const email = `learner-${Date.now()}@example.com`;
    const result = await auth.api.signUpEmail({
      body: { email, password: "oriel-learner-12", name: "Integration Learner" },
    });
    const userId = result.user.id;
    expect(userId).toBeTruthy();

    const [item] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.publicationState, "published"))
      .limit(1);
    expect(item).toBeTruthy();
    if (!item) return;

    await db.insert(saves).values({ userId, contentItemId: item.id });
    const saved = await db.select().from(saves).where(eq(saves.userId, userId));
    expect(saved.length).toBeGreaterThan(0);

    const moderation = await moderateSubmission({
      contentItemId: item.id,
      text: "ordinary public educational text",
      safetyClass: "general",
    });
    expect(moderation.case).toBeTruthy();

    const [appeal] = await db
      .insert(appeals)
      .values({
        caseId: moderation.case!.id,
        userId,
        statement: "Please review this hold; the item is original teaching material.",
      })
      .returning();
    expect(appeal?.id).toBeTruthy();

    const admin = (await db.select().from(user).limit(1))[0];
    if (admin) {
      await recordAdminAction({
        actorUserId: admin.id,
        action: "moderation.approve",
        targetType: "moderation_case",
        targetId: moderation.case!.id,
        confirmed: true,
      });
    }
  });

  it("keeps BYOK credentials isolated per user", async () => {
    const env = getEnv();
    const a = await auth.api.signUpEmail({
      body: {
        email: `byok-a-${Date.now()}@example.com`,
        password: "oriel-learner-12",
        name: "BYOK A",
      },
    });
    const b = await auth.api.signUpEmail({
      body: {
        email: `byok-b-${Date.now()}@example.com`,
        password: "oriel-learner-12",
        name: "BYOK B",
      },
    });
    await db.insert(userByokCredentials).values({
      userId: a.user.id,
      providerName: `iso-${Date.now()}`,
      baseUrl: "https://example.test/v1",
      keyCiphertext: encryptSecret("secret-for-user-a-only", env.ENCRYPTION_KEY),
      keyLastFour: lastFour("secret-for-user-a-only"),
    });
    const credA = await resolveProviderCredentials(a.user.id);
    const credB = await resolveProviderCredentials(b.user.id);
    expect(credA?.source).toBe("byok");
    expect(credA?.apiKey).toBe("secret-for-user-a-only");
    expect(credB?.apiKey).not.toBe("secret-for-user-a-only");
  });
});
