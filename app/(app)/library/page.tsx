import { Tabs, TabsContent, TabsList, TabsTrigger } from "@appica/ui-react/tabs";
import { getCurrentSession } from "@/lib/auth/permissions";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";
import { db } from "@/lib/db";
import {
  saves,
  contentItems,
  collections,
  feedImpressions,
  uploads,
  learningPaths,
  progressRecords,
} from "@/lib/db/schema";
import { CollectionCreate } from "@/components/library/collection-create";
import { and, desc, eq } from "drizzle-orm";

export default async function LibraryPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="info">
          <AlertTitle>Sign in to keep a library</AlertTitle>
          <AlertDescription>
            Anonymous reading works. Permanent saves, collections, uploads, and history need an account.
          </AlertDescription>
        </Alert>
        <Link href="/sign-in" className={`${buttonVariants({ variant: "primary" })} mt-6 inline-flex`}>
          Sign in
        </Link>
      </div>
    );
  }

  const saved = await db
    .select({ item: contentItems })
    .from(saves)
    .innerJoin(contentItems, eq(saves.contentItemId, contentItems.id))
    .where(eq(saves.userId, session.user.id))
    .orderBy(desc(saves.createdAt));
  const userCollections = await db
    .select()
    .from(collections)
    .where(eq(collections.ownerUserId, session.user.id));
  const history = await db
    .select({ item: contentItems })
    .from(feedImpressions)
    .innerJoin(contentItems, eq(feedImpressions.contentItemId, contentItems.id))
    .where(eq(feedImpressions.userId, session.user.id))
    .orderBy(desc(feedImpressions.createdAt))
    .limit(40);
  const userUploads = await db
    .select()
    .from(uploads)
    .where(eq(uploads.ownerUserId, session.user.id))
    .orderBy(desc(uploads.createdAt));
  const drafts = await db
    .select()
    .from(contentItems)
    .where(and(eq(contentItems.ownerUserId, session.user.id), eq(contentItems.publicationState, "draft")));
  const pathProgress = await db
    .select({ path: learningPaths, record: progressRecords })
    .from(progressRecords)
    .innerJoin(learningPaths, eq(progressRecords.pathId, learningPaths.id))
    .where(eq(progressRecords.userId, session.user.id));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-serif text-4xl">Library</h1>
      <Tabs defaultValue="saved" className="mt-6">
        <TabsList>
          <TabsTrigger value="saved">Saved</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="paths">Paths</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>
        <TabsContent value="saved" className="mt-6 space-y-3">
          {saved.length === 0 ? <p className="text-foreground-muted">Nothing saved yet.</p> : null}
          {saved.map(({ item }) => (
            <article key={item.id} className="border-b border-border-muted py-3">
              <Link href={`/learn/${item.slug}`} className="font-serif text-xl underline">
                {item.title}
              </Link>
              <p className="text-sm text-foreground-muted">{item.learningObjective}</p>
            </article>
          ))}
        </TabsContent>
        <TabsContent value="collections" className="mt-6">
          <CollectionCreate />
          {userCollections.length === 0 ? (
            <p className="text-foreground-muted">Collections you create will live here.</p>
          ) : (
            userCollections.map((collection) => (
              <p key={collection.id} className="font-serif text-xl">
                {collection.title}{" "}
                <span className="text-sm text-foreground-muted">({collection.visibility})</span>
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="paths" className="mt-6">
          {pathProgress.length === 0 ? (
            <p className="text-foreground-muted">Completed paths will appear here.</p>
          ) : (
            pathProgress.map(({ path, record }) => (
              <p key={record.id}>
                <Link href={`/paths/${path.slug}`} className="underline">
                  {path.title}
                </Link>{" "}
                · {record.status}
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-6 space-y-2">
          {history.length === 0 ? (
            <p className="text-foreground-muted">Your recent items appear after you move through the feed.</p>
          ) : (
            history.map(({ item }) => (
              <p key={item.id}>
                <Link href={`/learn/${item.slug}`} className="underline">
                  {item.title}
                </Link>
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="uploads" className="mt-6 space-y-2">
          {userUploads.length === 0 ? (
            <p className="text-foreground-muted">Private uploads never become public unless you publish them.</p>
          ) : (
            userUploads.map((upload) => (
              <p key={upload.id} className="text-sm">
                {upload.originalFilename ?? upload.kind} · {upload.status} · {upload.isPrivate ? "private" : "shared"}
              </p>
            ))
          )}
        </TabsContent>
        <TabsContent value="drafts" className="mt-6 space-y-2">
          {drafts.length === 0 ? (
            <p className="text-foreground-muted">Creator drafts wait here before review.</p>
          ) : (
            drafts.map((item) => (
              <p key={item.id}>
                <Link href={`/learn/${item.slug}`} className="underline">
                  {item.title}
                </Link>
              </p>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
