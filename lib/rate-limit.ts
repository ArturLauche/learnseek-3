import { getRedis } from "./redis";
import { getEnv } from "./env";

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSec?: number;
}): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  const windowSec = params.windowSec ?? 60;
  const redis = getRedis();
  const n = await redis.incr(params.key);
  if (n === 1) await redis.expire(params.key, windowSec);
  const ttl = await redis.ttl(params.key);
  return {
    ok: n <= params.limit,
    remaining: Math.max(0, params.limit - n),
    retryAfterSec: ttl > 0 ? ttl : windowSec,
  };
}

export async function rateLimitRequest(params: {
  userId?: string | null;
  anonymousKey?: string | null;
  ip?: string | null;
  scope: string;
}) {
  const env = getEnv();
  const id = params.userId ?? params.anonymousKey ?? params.ip ?? "anon";
  const limit = params.userId ? env.RATE_LIMIT_USER_PER_MIN : env.RATE_LIMIT_ANON_PER_MIN;
  return rateLimit({ key: `rl:${params.scope}:${id}`, limit });
}
