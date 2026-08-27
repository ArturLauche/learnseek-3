import { db } from "@/lib/db";
import { contentItems, contentItemSources, sources, topics } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@appica/ui-react/badge";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [item] = await db
    .select({
      title: contentItems.title,
      learningObjective: contentItems.learningObjective,
    })
    .from(contentItems)
    .where(
      and(
        eq(contentItems.slug, slug),
        eq(contentItems.publicationState, "published"),
        eq(contentItems.visibility, "public"),
        isNull(contentItems.deletedAt),
      ),
    )
    .limit(1);
  if (!item) return { title: "Not found" };
  return {
    title: item.title,
    description: item.learningObjective,
    openGraph: {
      title: item.title,
      description: item.learningObjective,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item] = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.slug, slug),
        eq(contentItems.publicationState, "published"),
        eq(contentItems.visibility, "public"),
        isNull(contentItems.deletedAt),
      ),
    )
    .limit(1);
  if (!item) notFound();
  const topic = item.primaryTopicId
    ? (await db.select().from(topics).where(eq(topics.id, item.primaryTopicId)).limit(1))[0]
    : null;
  const itemSources = await db
    .select({ source: sources, citation: contentItemSources.citation })
    .from(contentItemSources)
    .innerJoin(sources, eq(contentItemSources.sourceId, sources.id))
    .where(eq(contentItemSources.contentItemId, item.id));

  return (
    <article className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-xs tracking-[0.2em] uppercase text-foreground-subtle">Public share</p>
      <h1 className="mt-3 font-serif text-4xl">{item.title}</h1>
      <p className="mt-3 text-foreground-muted">{item.learningObjective}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{item.format.replaceAll("_", " ")}</Badge>
        <Badge variant="soft">{item.origin.replaceAll("_", " ")}</Badge>
        {topic ? <Badge variant="info">{topic.name}</Badge> : null}
      </div>
      <div className="mt-8 space-y-4 leading-7">{item.bodyText.split("\n\n").map((p) => <p key={p.slice(0, 20)}>{p}</p>)}</div>
      <section className="mt-10">
        <h2 className="font-serif text-2xl">Sources</h2>
        <ul className="mt-3 space-y-2">
          {itemSources.map(({ source, citation }) => (
            <li key={source.id}>
              <a className="underline" href={source.canonicalUrl ?? undefined} rel="noreferrer">
                {source.title}
              </a>
              <p className="text-sm text-foreground-muted">{citation}</p>
            </li>
          ))}
        </ul>
      </section>
      <Link href="/home" className={`${buttonVariants({ variant: "primary" })} mt-8 inline-flex`}>
        Learn in Oriel
      </Link>
    </article>
  );
}
