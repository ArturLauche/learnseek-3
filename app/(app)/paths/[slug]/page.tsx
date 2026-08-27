import { db } from "@/lib/db";
import { contentItems, learningPaths, pathItems, pathSections, progressRecords } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth/permissions";

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [path] = await db
    .select()
    .from(learningPaths)
    .where(and(eq(learningPaths.slug, slug), isNull(learningPaths.deletedAt)))
    .limit(1);
  if (!path) notFound();
  const session = await getCurrentSession();
  const sections = await db
    .select()
    .from(pathSections)
    .where(eq(pathSections.pathId, path.id))
    .orderBy(pathSections.position);
  const items = sections.length
    ? await db
        .select({ item: contentItems, sectionId: pathItems.sectionId, position: pathItems.position })
        .from(pathItems)
        .innerJoin(contentItems, eq(pathItems.contentItemId, contentItems.id))
        .where(
          eq(
            pathItems.sectionId,
            sections[0]!.id,
          ),
        )
    : [];
  const allItems = [];
  for (const section of sections) {
    const rows = await db
      .select({ item: contentItems, position: pathItems.position })
      .from(pathItems)
      .innerJoin(contentItems, eq(pathItems.contentItemId, contentItems.id))
      .where(eq(pathItems.sectionId, section.id));
    allItems.push({ section, rows });
  }
  const completed = session?.user
    ? await db
        .select()
        .from(progressRecords)
        .where(and(eq(progressRecords.userId, session.user.id), eq(progressRecords.pathId, path.id)))
    : [];
  const done = new Set(completed.filter((row) => row.status === "completed").map((row) => row.contentItemId));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs tracking-[0.2em] text-foreground-subtle uppercase">Learning path</p>
      <h1 className="mt-2 font-serif text-4xl">{path.title}</h1>
      <p className="mt-3 text-foreground-muted">{path.description}</p>
      <p className="mt-2 text-sm text-foreground-subtle">About {path.estimatedMinutes} minutes. Follow, resume, revisit.</p>
      <ol className="mt-8 space-y-8">
        {allItems.map(({ section, rows }) => (
          <li key={section.id}>
            <h2 className="font-serif text-2xl">{section.title}</h2>
            <ul className="mt-3 space-y-2">
              {rows.map(({ item }) => (
                <li key={item.id}>
                  <Link href={`/learn/${item.slug}`} className="underline">
                    {item.title}
                  </Link>
                  {done.has(item.id) ? (
                    <span className="ms-2 text-xs text-foreground-subtle">visited</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {items.length === 0 && allItems.every((block) => block.rows.length === 0) ? (
        <p className="mt-6 text-foreground-muted">This path is being assembled.</p>
      ) : null}
    </div>
  );
}
