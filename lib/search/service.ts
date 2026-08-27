import { and, eq, inArray, sql } from "drizzle-orm";
import { db, client } from "@/lib/db";
import { contentItems, searches, topics } from "@/lib/db/schema";
import { isPubliclyVisible } from "@/lib/content/visibility";
import { embedTexts } from "@/lib/ai/provider";
import { isAiConfigured } from "@/lib/env";
import {
  nearestByEmbedding,
  reciprocalRankFusion,
  searchCapability,
  type SearchCapability,
} from "./hybrid";

export type SearchFilters = {
  q: string;
  topic?: string;
  format?: string;
  difficulty?: string;
  language?: string;
  userId?: string | null;
  /** Test/fixture query vector. Production uses embedTexts when AI is configured. */
  queryEmbedding?: number[];
};

export async function searchContent(filters: SearchFilters) {
  const q = filters.q.trim();
  const capability = await searchCapability();
  let topicId: string | undefined;
  if (filters.topic) {
    const [topic] = await db.select().from(topics).where(eq(topics.slug, filters.topic)).limit(1);
    topicId = topic?.id;
  }

  type Row = typeof contentItems.$inferSelect;
  let rows: Row[] = [];
  try {
    const result = await client<Row[]>`
      select *
      from content_items
      where publication_state = 'published'
        and visibility = 'public'
        and deleted_at is null
        and (${q} = '' or search_vector @@ websearch_to_tsquery('english', ${q}) or title ilike ${"%" + q + "%"})
        and (${filters.format ?? null}::text is null or format::text = ${filters.format ?? null})
        and (${filters.difficulty ?? null}::text is null or difficulty::text = ${filters.difficulty ?? null})
        and (${filters.language ?? null}::text is null or language = ${filters.language ?? null})
        and (${topicId ?? null}::uuid is null or primary_topic_id = ${topicId ?? null}::uuid)
      order by
        case when ${q} = '' then 0 else ts_rank(search_vector, websearch_to_tsquery('english', ${q})) end desc
      limit 40
    `;
    rows = result as Row[];
  } catch {
    const conditions = [
      eq(contentItems.publicationState, "published"),
      eq(contentItems.visibility, "public"),
      sql`${contentItems.deletedAt} is null`,
    ];
    if (q) conditions.push(sql`${contentItems.title} ilike ${"%" + q + "%"}`);
    rows = await db
      .select()
      .from(contentItems)
      .where(and(...conditions))
      .limit(40);
  }

  let knnIds: string[] = [];
  let usedHybrid = false;
  const queryVector = filters.queryEmbedding ?? (q && isAiConfigured() ? await embedQuery(q) : null);
  if (queryVector && capability.embeddingsStored) {
    try {
      const neighbors = await nearestByEmbedding(queryVector, 12);
      knnIds = neighbors.filter((row) => row.distance < 0.55).map((row) => row.contentItemId);
      usedHybrid = knnIds.length > 0;
    } catch {
      knnIds = [];
    }
  }

  if (usedHybrid) {
    const ftsIds = rows.map((row) => row.id);
    const mergedIds = reciprocalRankFusion(ftsIds, knnIds);
    const missing = mergedIds.filter((id) => !rows.some((row) => row.id === id));
    if (missing.length) {
      const extra = await db.select().from(contentItems).where(inArray(contentItems.id, missing));
      rows = [...rows, ...extra];
    }
    const byId = new Map(rows.map((row) => [row.id, row]));
    rows = mergedIds.map((id) => byId.get(id)).filter(Boolean) as Row[];
  }

  const visible = rows.filter((row) =>
    isPubliclyVisible({
      publicationState: row.publicationState,
      visibility: row.visibility,
      moderationState: row.moderationState,
      deletedAt: row.deletedAt,
    }),
  );

  const effective: SearchCapability = {
    ...capability,
    mode: usedHybrid ? "hybrid" : capability.mode,
  };

  await db.insert(searches).values({
    userId: filters.userId,
    query: q,
    filters: {
      topic: filters.topic,
      format: filters.format,
      difficulty: filters.difficulty,
      language: filters.language,
      semantic: usedHybrid,
      mode: effective.mode,
    },
    resultCount: visible.length,
  });

  return { items: visible, capability: effective };
}

async function embedQuery(q: string): Promise<number[] | null> {
  try {
    const vectors = await embedTexts([q.slice(0, 2000)]);
    return vectors?.[0] ?? null;
  } catch {
    return null;
  }
}
