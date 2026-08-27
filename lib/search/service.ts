import { and, eq, inArray, sql } from "drizzle-orm";
import { db, client } from "@/lib/db";
import { contentItems, embeddings, searches, topics } from "@/lib/db/schema";
import { isPubliclyVisible } from "@/lib/content/visibility";
import { embedTexts } from "@/lib/ai/provider";
import { isAiConfigured } from "@/lib/env";

export type SearchFilters = {
  q: string;
  topic?: string;
  format?: string;
  difficulty?: string;
  language?: string;
  userId?: string | null;
};

export async function searchContent(filters: SearchFilters) {
  const q = filters.q.trim();
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

  const semanticIds = q && isAiConfigured() ? await semanticIdsFor(q) : [];
  if (semanticIds.length > 0) {
    const missing = semanticIds.filter((id) => !rows.some((row) => row.id === id));
    if (missing.length) {
      const extra = await db.select().from(contentItems).where(inArray(contentItems.id, missing));
      rows = [...extra, ...rows];
    }
    rows.sort((a, b) => semanticIds.indexOf(a.id) - semanticIds.indexOf(b.id) || 0);
    const unmatched = rows.filter((row) => !semanticIds.includes(row.id));
    const matched = semanticIds.map((id) => rows.find((row) => row.id === id)).filter(Boolean) as Row[];
    rows = [...matched, ...unmatched].slice(0, 40);
  }

  const visible = rows.filter((row) =>
    isPubliclyVisible({
      publicationState: row.publicationState,
      visibility: row.visibility,
      moderationState: row.moderationState,
      deletedAt: row.deletedAt,
    }),
  );

  await db.insert(searches).values({
    userId: filters.userId,
    query: q,
    filters: {
      topic: filters.topic,
      format: filters.format,
      difficulty: filters.difficulty,
      language: filters.language,
      semantic: semanticIds.length > 0,
    },
    resultCount: visible.length,
  });

  return visible;
}

async function semanticIdsFor(q: string): Promise<string[]> {
  try {
    const vectors = await embedTexts([q.slice(0, 2000)]);
    const vector = vectors?.[0];
    if (!vector) return [];
    const vectorLiteral = `[${vector.join(",")}]`;
    const rows = await db
      .select({
        contentItemId: embeddings.contentItemId,
        distance: sql<number>`${embeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`,
      })
      .from(embeddings)
      .orderBy(sql`${embeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`)
      .limit(12);
    return rows.filter((row) => Number(row.distance) < 0.55).map((row) => row.contentItemId);
  } catch {
    return [];
  }
}
