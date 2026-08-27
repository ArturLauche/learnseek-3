import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { db, client } from "@/lib/db";
import { contentItems, embeddings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { searchContent } from "@/lib/search/service";
import { vectorLiteral } from "@/lib/search/hybrid";

const hasDb = Boolean(process.env.DATABASE_URL);

function unit(index: number, dim = 1536): number[] {
  const values = new Array(dim).fill(0);
  values[index] = 1;
  return values;
}

describe.skipIf(!hasDb)("hybrid search with fixture embeddings", () => {
  it("runs pgvector cosine kNN and merges with FTS", async () => {
    const stamp = `knn${Date.now()}`;
    const [itemA] = await db
      .insert(contentItems)
      .values({
        slug: `zebracanthus-${stamp}`,
        title: `zebracanthus ${stamp}`,
        learningObjective: "Locate the nearest neighbor of fixture vector A.",
        bodyText: "This item is the kNN anchor and should not match the FTS nonce.",
        format: "explanation",
        origin: "editorial",
        publicationState: "published",
        moderationState: "auto_approved",
        visibility: "public",
        publishedAt: new Date(),
      })
      .returning();
    const [itemB] = await db
      .insert(contentItems)
      .values({
        slug: `narwhalium-${stamp}`,
        title: `narwhalium ${stamp}`,
        learningObjective: "Match the FTS-only nonce in the title.",
        bodyText: "This item is the FTS hit and is orthogonal in vector space.",
        format: "explanation",
        origin: "editorial",
        publicationState: "published",
        moderationState: "auto_approved",
        visibility: "public",
        publishedAt: new Date(),
      })
      .returning();
    if (!itemA || !itemB) throw new Error("failed to insert fixture items");

    try {
      const litA = vectorLiteral(unit(0));
      const litB = vectorLiteral(unit(1));
      await client.unsafe(
        `insert into embeddings (content_item_id, model, embedding) values ('${itemA.id}', 'fixture-knn', '${litA}'::vector), ('${itemB.id}', 'fixture-knn', '${litB}'::vector)`,
      );

      const result = await searchContent({
        q: `narwhalium ${stamp}`,
        queryEmbedding: unit(0),
      });

      expect(result.capability.mode).toBe("hybrid");
      expect(result.capability.embeddingsStored).toBe(true);
      const ids = result.items.map((row) => row.id);
      expect(ids).toContain(itemA.id);
      expect(ids).toContain(itemB.id);
    } finally {
      await db.delete(embeddings).where(eq(embeddings.contentItemId, itemA.id));
      await db.delete(embeddings).where(eq(embeddings.contentItemId, itemB.id));
      await db.delete(contentItems).where(eq(contentItems.id, itemA.id));
      await db.delete(contentItems).where(eq(contentItems.id, itemB.id));
    }
  });
});
