import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { replenishCount, shouldReplenish } from "@/lib/feed/ranking";
import { serveFeed } from "@/lib/feed/service";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("feed integration", () => {
  it("serves a prepared queue from postgres without waiting on AI", async () => {
    const feed = await serveFeed({ userId: null, anonymousKey: `test-${Date.now()}` });
    expect(feed.items.length).toBeGreaterThanOrEqual(1);
    expect(shouldReplenish(feed.items.length) || feed.items.length >= 10).toBe(true);
    expect(replenishCount(0)).toBe(15);
  });
});
