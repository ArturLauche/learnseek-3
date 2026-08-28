import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serveFeed } from "@/lib/feed/service";
import { db } from "@/lib/db";
import { feedImpressions } from "@/lib/db/schema";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

function anonymousKeyFrom(request: NextRequest) {
  return request.cookies.get("oriel_anon")?.value ?? crypto.randomUUID();
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const cookieStore = await cookies();
  let anonymousKey = cookieStore.get("oriel_anon")?.value;
  if (!session && !anonymousKey) {
    anonymousKey = crypto.randomUUID();
  }
  const feed = await serveFeed({
    userId: session?.user.id ?? null,
    anonymousKey: session ? null : anonymousKey ?? anonymousKeyFrom(request),
  });

  const response = NextResponse.json(feed);
  if (!session && anonymousKey) {
    response.cookies.set("oriel_anon", anonymousKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  const body = (await request.json()) as { contentItemId?: string; queueItemId?: string };
  if (body.contentItemId) {
    await db.insert(feedImpressions).values({
      userId: session?.user.id,
      anonymousKey: request.cookies.get("oriel_anon")?.value,
      contentItemId: body.contentItemId,
      queueItemId: body.queueItemId,
    });
  }
  return NextResponse.json({ ok: true });
}
