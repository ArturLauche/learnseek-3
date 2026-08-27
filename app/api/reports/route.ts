import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { feedInteractions, reportCategories, reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { moderateSubmission } from "@/lib/moderation/pipeline";

const schema = z.object({
  contentItemId: z.string().uuid(),
  details: z.string().max(2000).optional(),
  category: z.string().default("spam"),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const [category] = await db
    .select()
    .from(reportCategories)
    .where(eq(reportCategories.slug, parsed.data.category))
    .limit(1);

  await db.insert(reports).values({
    reporterUserId: session?.user.id,
    contentItemId: parsed.data.contentItemId,
    categoryId: category?.id,
    details: parsed.data.details,
    status: "open",
  });
  await db.insert(feedInteractions).values({
    userId: session?.user.id,
    anonymousKey: request.cookies.get("oriel_anon")?.value,
    contentItemId: parsed.data.contentItemId,
    kind: "report",
  });
  await moderateSubmission({
    contentItemId: parsed.data.contentItemId,
    text: parsed.data.details ?? `user report: ${parsed.data.category}`,
    safetyClass: "general",
  });
  return NextResponse.json({ ok: true });
}
