import { db } from "@/lib/db";
import { contentItemTags, tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function autoTagContent(params: {
  contentItemId: string;
  format: string;
  topicName?: string | null;
}) {
  const slugs = [params.format.replaceAll("_", "-")];
  if (params.topicName) slugs.push(params.topicName.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  for (const slug of slugs) {
    if (!slug) continue;
    const [existing] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
    const tag =
      existing ??
      (
        await db
          .insert(tags)
          .values({ slug, name: slug.replaceAll("-", " ") })
          .returning()
      )[0];
    if (!tag) continue;
    await db
      .insert(contentItemTags)
      .values({ contentItemId: params.contentItemId, tagId: tag.id })
      .onConflictDoNothing();
  }
}
