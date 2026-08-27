import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { collectionItems, collections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { slugify } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(400).optional(),
  visibility: z.enum(["public", "private", "unlisted"]).default("private"),
});

const addSchema = z.object({
  collectionId: z.string().uuid(),
  contentItemId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json();
  if (body.contentItemId && body.collectionId) {
    const parsed = addSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
    const [owned] = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, parsed.data.collectionId), eq(collections.ownerUserId, session.user.id)),
      )
      .limit(1);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await db
      .insert(collectionItems)
      .values({ collectionId: owned.id, contentItemId: parsed.data.contentItemId })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const [row] = await db
    .insert(collections)
    .values({
      ownerUserId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      slug: `${slugify(parsed.data.title)}-${crypto.randomUUID().slice(0, 6)}`,
    })
    .returning();
  return NextResponse.json({ ok: true, collection: row });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db.select().from(collections).where(eq(collections.ownerUserId, session.user.id));
  return NextResponse.json({ collections: rows });
}
