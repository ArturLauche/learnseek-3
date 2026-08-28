import { count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { isAiConfigured } from "@/lib/env";

export type SearchCapability = {
  fts: true;
  embeddingsStored: boolean;
  queryEmbeddingAvailable: boolean;
  mode: "fts_only" | "hybrid" | "fts_vectors_idle";
};

export function reciprocalRankFusion(ftsIds: string[], knnIds: string[], k = 60): string[] {
  const scores = new Map<string, number>();
  ftsIds.forEach((id, index) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
  });
  knnIds.forEach((id, index) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
  });
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

export function vectorLiteral(values: number[]): string {
  if (!values.length || values.length > 4096) throw new Error("invalid_vector");
  const parts = values.map((n) => {
    if (!Number.isFinite(n)) throw new Error("invalid_vector");
    return String(n);
  });
  return `[${parts.join(",")}]`;
}

export async function searchCapability(): Promise<SearchCapability> {
  let embeddingsStored = false;
  try {
    const [row] = await db.select({ n: count() }).from(embeddings);
    embeddingsStored = Number(row?.n ?? 0) > 0;
  } catch {
    embeddingsStored = false;
  }
  const queryEmbeddingAvailable = isAiConfigured();
  const mode: SearchCapability["mode"] =
    embeddingsStored && queryEmbeddingAvailable
      ? "hybrid"
      : embeddingsStored
        ? "fts_vectors_idle"
        : "fts_only";
  return { fts: true, embeddingsStored, queryEmbeddingAvailable, mode };
}

export async function nearestByEmbedding(
  query: number[],
  limit = 12,
): Promise<{ contentItemId: string; distance: number }[]> {
  const literal = vectorLiteral(query);
  const rows = await db
    .select({
      contentItemId: embeddings.contentItemId,
      distance: sql<number>`${embeddings.embedding} <=> ${sql.raw(`'${literal}'::vector`)}`,
    })
    .from(embeddings)
    .orderBy(sql`${embeddings.embedding} <=> ${sql.raw(`'${literal}'::vector`)}`)
    .limit(limit);
  return rows.map((row) => ({ contentItemId: row.contentItemId, distance: Number(row.distance) }));
}
