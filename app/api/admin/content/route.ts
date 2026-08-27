import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { contentItemSources, contentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordAdminAction } from "@/lib/admin/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { canPublish } from "@/lib/content/visibility";

const schema = z.object({
  contentItemId: z.string().uuid(),
  action: z.enum(["publish", "unpublish", "feature", "takedown"]),
  confirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  await requirePermission("admin:content");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, parsed.data.contentItemId)).limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (parsed.data.action === "publish") {
    const sources = await db
      .select()
      .from(contentItemSources)
      .where(eq(contentItemSources.contentItemId, item.id));
    const gate = canPublish({
      moderationState: item.moderationState,
      publicationState: item.publicationState,
      hasSources: sources.length > 0,
      safetyClass: item.safetyClass,
      schemaValid: true,
    });
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 400 });
    await db
      .update(contentItems)
      .set({
        publicationState: "published",
        visibility: "public",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(contentItems.id, item.id));
  }
  if (parsed.data.action === "unpublish") {
    await db
      .update(contentItems)
      .set({ publicationState: "archived", visibility: "private", updatedAt: new Date() })
      .where(eq(contentItems.id, item.id));
  }
  if (parsed.data.action === "feature") {
    await db
      .update(contentItems)
      .set({ featuredUntil: new Date(Date.now() + 7 * 86_400_000), updatedAt: new Date() })
      .where(eq(contentItems.id, item.id));
  }
  if (parsed.data.action === "takedown") {
    await db
      .update(contentItems)
      .set({ publicationState: "taken_down", visibility: "private", updatedAt: new Date() })
      .where(eq(contentItems.id, item.id));
  }
  await recordAdminAction({
    actorUserId: session.user.id,
    action: `content.${parsed.data.action}`,
    targetType: "content_item",
    targetId: item.id,
    confirmed: true,
  });
  return NextResponse.json({ ok: true });
}
