import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentItems, embeddings } from "@/lib/db/schema";
import { embedTexts } from "./provider";

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

export function jaccard(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 || right.size === 0) return 0;
  let inter = 0;
  for (const token of left) if (right.has(token)) inter += 1;
  return inter / (left.size + right.size - inter);
}

export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    left += x * x;
    right += y * y;
  }
  if (left === 0 || right === 0) return 0;
  return dot / (Math.sqrt(left) * Math.sqrt(right));
}

export async function findSemanticDuplicate(params: {
  title: string;
  bodyText: string;
  threshold?: number;
}): Promise<{ duplicate: boolean; contentItemId?: string; score: number; method: string }> {
  const threshold = params.threshold ?? 0.9;
  const query = `${params.title}\n${params.bodyText}`;
  const vectors = await embedTexts([query]);
  if (vectors?.[0]) {
    try {
      const vectorLiteral = `[${vectors[0].join(",")}]`;
      const rows = await db
        .select({
          contentItemId: embeddings.contentItemId,
          distance: sql<number>`${embeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`,
        })
        .from(embeddings)
        .orderBy(sql`${embeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`)
        .limit(3);
      const nearest = rows[0];
      if (nearest) {
        const similarity = 1 - Number(nearest.distance);
        if (similarity >= threshold) {
          return {
            duplicate: true,
            contentItemId: nearest.contentItemId,
            score: similarity,
            method: "embedding",
          };
        }
      }
    } catch {
      // pgvector compare can fail if dimensions mismatch; fall through to lexical.
    }
  }

  const published = await db
    .select({ id: contentItems.id, title: contentItems.title, bodyText: contentItems.bodyText })
    .from(contentItems)
    .where(eq(contentItems.publicationState, "published"))
    .orderBy(desc(contentItems.createdAt))
    .limit(80);

  let best = { id: "", score: 0 };
  for (const row of published) {
    const score = jaccard(`${row.title} ${row.bodyText}`, query);
    if (score > best.score) best = { id: row.id, score };
  }
  if (best.score >= 0.72) {
    return { duplicate: true, contentItemId: best.id, score: best.score, method: "jaccard" };
  }
  return { duplicate: false, score: best.score, method: "jaccard" };
}

export async function storeEmbedding(contentItemId: string, text: string) {
  const vectors = await embedTexts([text.slice(0, 8000)]);
  if (!vectors?.[0]) return null;
  const envModel = process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  await db.insert(embeddings).values({
    contentItemId,
    model: envModel,
    embedding: vectors[0],
  });
  return vectors[0];
}
