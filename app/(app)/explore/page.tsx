import { db } from "@/lib/db";
import { topics, learningPaths, contentItems, announcements } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@appica/ui-react/card";
import { Badge } from "@appica/ui-react/badge";

export default async function ExplorePage() {
  const topicRows = await db
    .select()
    .from(topics)
    .where(isNull(topics.deletedAt))
    .orderBy(topics.sortOrder);
  const paths = await db
    .select()
    .from(learningPaths)
    .where(and(eq(learningPaths.visibility, "public"), isNull(learningPaths.deletedAt)))
    .limit(8);
  const recent = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.publicationState, "published"),
        eq(contentItems.visibility, "public"),
        isNull(contentItems.deletedAt),
      ),
    )
    .orderBy(desc(contentItems.publishedAt))
    .limit(8);
  const notices = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(3);

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8">
      <header>
        <h1 className="font-serif text-4xl">Explore</h1>
        <p className="mt-2 text-foreground-muted">
          Topics, curated paths, and recently published windows of light.
        </p>
        {notices.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {notices.map((row) => (
              <li key={row.id} className="rounded-md border border-border px-3 py-2">
                <strong>{row.title}</strong> — {row.body}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      <section>
        <h2 className="mb-4 font-serif text-2xl">Topics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topicRows.map((topic) => (
            <Link key={topic.id} href={`/search?topic=${topic.slug}`}>
              <Card frame="solid" className="h-full">
                <CardHeader>
                  <CardTitle className="font-serif text-xl font-normal">{topic.name}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-serif text-2xl">Learning paths</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {paths.map((path) => (
            <Link key={path.id} href={`/paths/${path.slug}`}>
              <Card frame="solid">
                <CardHeader>
                  <CardTitle className="font-serif text-xl font-normal">{path.title}</CardTitle>
                  <CardDescription>{path.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 font-serif text-2xl">Recently published</h2>
        <ul className="space-y-3">
          {recent.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 border-b border-border-muted py-3">
              <div>
                <Link href={`/learn/${item.slug}`} className="font-serif text-lg underline">
                  {item.title}
                </Link>
                <p className="text-sm text-foreground-muted">{item.learningObjective}</p>
              </div>
              <Badge variant="outline">{item.format.replaceAll("_", " ")}</Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
