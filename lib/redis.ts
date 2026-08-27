import { Redis } from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (globalForRedis.redis) return globalForRedis.redis;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is required");
  const redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  globalForRedis.redis = redis;
  return redis;
}
