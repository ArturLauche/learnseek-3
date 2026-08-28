import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentItems } from "@/lib/db/schema";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { enqueueTracked } from "@/lib/jobs";

const draftSchema = z.object({
  title: z.string().min(4),
  objective: z.string().min(8),
  body: z.string().optional(),
  sourceUrl: z.string().optional(),
  rights: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const parsed = draftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  if (!parsed.data.rights) {
    return NextResponse.json({ error: "Rights confirmation is required" }, { status: 400 });
  }
  const slug = `${slugify(parsed.data.title)}-${crypto.randomUUID().slice(0, 8)}`;
  const [item] = await db.insert(contentItems).values({
    slug,
    title: parsed.data.title,
    learningObjective: parsed.data.objective,
    bodyText: parsed.data.body ?? "",
    format: "explanation",
    origin: "community",
    publicationState: "draft",
    moderationState: "pending",
    visibility: "private",
    ownerUserId: session.user.id,
  }).returning();
  if (item) {
    await enqueueTracked({
      queue: "moderation",
      kind: "draft",
      userId: session.user.id,
      contentItemId: item.id,
      data: {
        contentItemId: item.id,
        text: `${item.title}\n${item.learningObjective}\n${item.bodyText}`,
        safetyClass: "general",
      },
      dedupeKey: `mod-draft:${item.id}`,
    });
  }
  return NextResponse.json({ ok: true, slug });
}
