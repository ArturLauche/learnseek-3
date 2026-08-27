import { NextResponse } from "next/server";
import { client } from "@/lib/db";
import { getRedis } from "@/lib/redis";
import { checkProviderHealth } from "@/lib/ai/provider";
import { getStorage } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { HeadBucketCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    await client`select 1`;
    checks.database = { ok: true };
  } catch (error) {
    checks.database = { ok: false, detail: error instanceof Error ? error.name : "error" };
  }

  try {
    const pong = await getRedis().ping();
    checks.redis = { ok: pong === "PONG" };
  } catch {
    checks.redis = { ok: false };
  }

  try {
    const env = getEnv();
    await getStorage().send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
    checks.storage = { ok: true };
  } catch {
    checks.storage = { ok: false };
  }

  try {
    const ai = await checkProviderHealth();
    checks.ai = { ok: ai.configured ? ai.reachable : true, detail: ai.configured ? "configured" : "unconfigured_fallback" };
  } catch {
    checks.ai = { ok: true, detail: "fallback" };
  }

  const ok = Object.values(checks).every((check) => check.ok);
  return NextResponse.json(
    { service: "oriel", ok, checks, time: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
