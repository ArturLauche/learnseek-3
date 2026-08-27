import { and, eq, isNull, sql } from "drizzle-orm";
import { db, client } from "@/lib/db";
import { contentItems, searches, topics } from "@/lib/db/schema";
import { isPubliclyVisible } from "@/lib/content/visibility";

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
      isNull(contentItems.deletedAt),
    ];
    if (q) conditions.push(sql`${contentItems.title} ilike ${"%" + q + "%"}`);
    rows = await db
      .select()
      .from(contentItems)
      .where(and(...conditions))
      .limit(40);
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
    },
    resultCount: visible.length,
  });

  return visible;
}
