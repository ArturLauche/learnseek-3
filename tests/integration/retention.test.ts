import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { runRetentionPurge } from "@/lib/privacy/purge";
import { db } from "@/lib/db";
import { retentionRuns } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("retention purge job", () => {
  it("dry-run records counts without requiring a live delete", async () => {
    const result = await runRetentionPurge({ dryRun: true, actorUserId: null });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.counts).toMatchObject({
      sessions: expect.any(Number),
      searches: expect.any(Number),
      impressions: expect.any(Number),
      artifacts: expect.any(Number),
      skippedHeld: expect.any(Number),
    });
    const [latest] = await db.select().from(retentionRuns).orderBy(desc(retentionRuns.startedAt)).limit(1);
    expect(latest?.status).toBe("completed");
    expect(latest?.dryRun).toBe(true);
  });
});
