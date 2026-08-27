import { Input } from "@appica/ui-react/input";
import { Search } from "@appica/icons-react";
import { db } from "@/lib/db";
import { contentItems } from "@/lib/db/schema";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { Badge } from "@appica/ui-react/badge";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; topic?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const rows =
    q.length === 0
      ? []
      : await db
          .select()
          .from(contentItems)
          .where(
            and(
              eq(contentItems.publicationState, "published"),
              eq(contentItems.visibility, "public"),
              isNull(contentItems.deletedAt),
              or(ilike(contentItems.title, `%${q}%`), ilike(contentItems.bodyText, `%${q}%`)),
            ),
          )
          .limit(30);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-serif text-4xl">Search</h1>
      <form className="mt-6">
        <Input
          name="q"
          defaultValue={q}
          startSlot={<Search />}
          clearable
          placeholder="Search titles, objectives, and passages"
          aria-label="Search Oriel"
        />
      </form>
      <ul className="mt-8 space-y-4">
        {rows.map((item) => (
          <li key={item.id} className="border-b border-border-muted pb-4">
            <p className="font-serif text-xl">{item.title}</p>
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
