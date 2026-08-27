import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { encryptSecret, lastFour } from "@/lib/crypto/secrets";
import { db } from "@/lib/db";
import { userByokCredentials } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  providerName: z.string().min(2).max(40),
  baseUrl: z.string().url(),
  apiKey: z.string().min(8).max(200),
  model: z.string().max(80).optional(),
  revoke: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const env = getEnv();
  if (parsed.data.revoke) {
    await db
      .update(userByokCredentials)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(userByokCredentials.userId, session.user.id),
          eq(userByokCredentials.providerName, parsed.data.providerName),
        ),
      );
    return NextResponse.json({ ok: true, revoked: true });
  }
  const ciphertext = encryptSecret(parsed.data.apiKey, env.ENCRYPTION_KEY);
  await db
    .insert(userByokCredentials)
    .values({
      userId: session.user.id,
      providerName: parsed.data.providerName,
      baseUrl: parsed.data.baseUrl,
      keyCiphertext: ciphertext,
      keyLastFour: lastFour(parsed.data.apiKey),
      model: parsed.data.model,
    })
    .onConflictDoUpdate({
      target: [userByokCredentials.userId, userByokCredentials.providerName],
      set: {
        baseUrl: parsed.data.baseUrl,
        keyCiphertext: ciphertext,
        keyLastFour: lastFour(parsed.data.apiKey),
        model: parsed.data.model,
        revokedAt: null,
        updatedAt: new Date(),
      },
    });
  return NextResponse.json({ ok: true, lastFour: lastFour(parsed.data.apiKey) });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db
    .select({
      providerName: userByokCredentials.providerName,
      baseUrl: userByokCredentials.baseUrl,
      keyLastFour: userByokCredentials.keyLastFour,
      model: userByokCredentials.model,
      revokedAt: userByokCredentials.revokedAt,
    })
    .from(userByokCredentials)
    .where(and(eq(userByokCredentials.userId, session.user.id), isNull(userByokCredentials.revokedAt)));
  return NextResponse.json({ credentials: rows });
}
