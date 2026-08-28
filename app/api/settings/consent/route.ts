import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { consentRecords } from "@/lib/db/schema";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["analytics", "research", "retention_notice"]),
  granted: z.boolean(),
  version: z.string().default("privacy-v1"),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await db.insert(consentRecords).values({
    userId: session.user.id,
    kind: parsed.data.kind,
    granted: parsed.data.granted,
    version: parsed.data.version,
  });
  return NextResponse.json({ ok: true });
}
