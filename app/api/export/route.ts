import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  collections,
  contentItems,
  consentRecords,
  dataExportRequests,
  deletionRequests,
  preferences,
  profiles,
  saves,
  user,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { putObject } from "@/lib/storage";
import { z } from "zod";

const schema = z.object({ kind: z.enum(["export", "delete"]) });

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  if (parsed.data.kind === "delete") {
    await db.insert(deletionRequests).values({ userId: session.user.id, status: "queued" });
    await db
      .update(user)
      .set({ status: "pending_deletion", updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
    return NextResponse.json({ ok: true, status: "deletion_queued" });
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id));
  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, session.user.id));
  const saved = await db.select().from(saves).where(eq(saves.userId, session.user.id));
  const owned = await db.select().from(contentItems).where(eq(contentItems.ownerUserId, session.user.id));
  const cols = await db.select().from(collections).where(eq(collections.ownerUserId, session.user.id));
  const consents = await db.select().from(consentRecords).where(eq(consentRecords.userId, session.user.id));
  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: session.user.id, email: session.user.email, name: session.user.name },
    profile,
    preferences: pref,
    saves: saved.map((row) => row.contentItemId),
    createdItems: owned.map((row) => ({ id: row.id, slug: row.slug, title: row.title })),
    collections: cols.map((row) => ({ id: row.id, title: row.title, visibility: row.visibility })),
    consents,
  };
  const key = `exports/${session.user.id}/${Date.now()}.json`;
  await putObject({
    key,
    body: JSON.stringify(payload, null, 2),
    contentType: "application/json",
  });
  await db.insert(dataExportRequests).values({
    userId: session.user.id,
    status: "completed",
    objectKey: key,
    completedAt: new Date(),
  });
  return NextResponse.json({ ok: true, objectKey: key });
}
