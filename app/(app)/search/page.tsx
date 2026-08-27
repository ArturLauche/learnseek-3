import { Input } from "@appica/ui-react/input";
import { Search } from "@appica/icons-react";
import { Badge } from "@appica/ui-react/badge";
import { searchContent } from "@/lib/search/service";
import { searchCapability } from "@/lib/search/hybrid";
import { getCurrentSession } from "@/lib/auth/permissions";
import Link from "next/link";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string; format?: string; difficulty?: string; language?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const session = await getCurrentSession();
  const result =
    q.length === 0 && !params.topic
      ? { items: [], capability: await searchCapability() }
      : await searchContent({
          q,
          topic: params.topic,
          format: params.format,
          difficulty: params.difficulty,
          language: params.language,
          userId: session?.user.id,
        });
  const rows = result.items;
  const capability = result.capability;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-serif text-4xl">Search</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Full-text search always runs.
        {capability.mode === "hybrid"
          ? " Semantic kNN is merged with FTS for this query."
          : capability.mode === "fts_vectors_idle"
            ? " Embeddings are stored, but no query-embedding provider is configured — results are FTS only."
            : " Semantic search is idle until embeddings exist and a provider can embed the query."}
      </p>
      <form className="mt-6 space-y-3">
        <Input
          name="q"
          defaultValue={q}
          startSlot={<Search />}
          clearable
          placeholder="Search titles, objectives, and passages"
          aria-label="Search Oriel"
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <label>
            Topic
            <input name="topic" defaultValue={params.topic} className="ms-2 rounded border border-border px-2 py-1" />
          </label>
          <label>
            Format
            <input name="format" defaultValue={params.format} className="ms-2 rounded border border-border px-2 py-1" />
          </label>
          <label>
            Difficulty
            <input
              name="difficulty"
              defaultValue={params.difficulty}
              className="ms-2 rounded border border-border px-2 py-1"
            />
          </label>
          <label>
            Language
            <input
              name="language"
              defaultValue={params.language}
              className="ms-2 rounded border border-border px-2 py-1"
            />
          </label>
        </div>
      </form>
      <ul className="mt-8 space-y-4">
        {q.length === 0 && !params.topic ? (
          <li className="text-foreground-muted">Type a query to search titles, objectives, and passages.</li>
        ) : rows.length === 0 ? (
          <li className="text-foreground-muted">No published items matched. Try fewer words or a different topic.</li>
        ) : null}
        {rows.map((item) => (
          <li key={item.id} className="border-b border-border-muted pb-4">
            <Link href={`/learn/${item.slug}`} className="font-serif text-xl underline">
              {item.title}
            </Link>
            <p className="text-sm text-foreground-muted">{item.learningObjective}</p>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">{item.format.replaceAll("_", " ")}</Badge>
              <Badge variant="soft">{item.durationSeconds}s</Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
