import { db } from "@/lib/db";
import { collections, contentItems, creators, profiles, user } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [account] = await db.select().from(user).where(eq(user.handle, handle)).limit(1);
  if (!account || account.deletedAt) notFound();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, account.id)).limit(1);
  const [creator] = await db.select().from(creators).where(eq(creators.userId, account.id)).limit(1);
  const published = await db
    .select()
    .from(contentItems)
    .where(
      and(
        eq(contentItems.ownerUserId, account.id),
        eq(contentItems.publicationState, "published"),
        eq(contentItems.visibility, "public"),
        isNull(contentItems.deletedAt),
      ),
    )
    .limit(20);
  const publicCollections = await db
    .select()
    .from(collections)
    .where(and(eq(collections.ownerUserId, account.id), eq(collections.visibility, "public")));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-4xl">{profile?.displayName ?? account.name}</h1>
      <p className="text-sm text-foreground-subtle">@{account.handle}</p>
      <p className="mt-3 text-foreground-muted">{profile?.bio ?? creator?.bio ?? ""}</p>
      {account.status !== "active" ? (
        <p className="mt-4 text-sm">Moderation status: {account.status}</p>
      ) : null}
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Published items</h2>
        <ul className="mt-3 space-y-2">
          {published.map((item) => (
            <li key={item.id}>
              <Link href={`/learn/${item.slug}`} className="underline">
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl">Public collections</h2>
        <ul className="mt-3">
          {publicCollections.map((collection) => (
            <li key={collection.id}>{collection.title}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
