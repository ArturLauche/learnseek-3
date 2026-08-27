import { randomBytes } from "node:crypto";
import { getEnv } from "./env";
import { logger } from "./logger";

const REDACT_KEYS = new Set([
  "password",
  "email",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "ai_api_key",
  "auth_secret",
  "encryption_key",
  "storage_secret_key",
  "prompt",
  "fulltext",
  "keyciphertext",
  "smtp_password",
  "vapid_private_key",
]);

function hexId(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

function sanitizeAttrs(attrs: Record<string, string | number | boolean>) {
  const out: { key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (REDACT_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === "number") out.push({ key, value: { intValue: String(Math.trunc(value)) } });
    else if (typeof value === "boolean") out.push({ key, value: { boolValue: value } });
    else out.push({ key, value: { stringValue: String(value).slice(0, 120) } });
  }
  return out;
}

export type Span = {
  name: string;
  start: bigint;
  attrs: Record<string, string | number | boolean>;
  end: (attrs?: Record<string, string | number | boolean>, status?: "ok" | "error") => Promise<void>;
};

const counters = new Map<string, number>();

export function recordMetric(name: string, delta = 1) {
  counters.set(name, (counters.get(name) ?? 0) + delta);
}

export function startSpan(name: string, attrs: Record<string, string | number | boolean> = {}): Span {
  const start = process.hrtime.bigint();
  return {
    name,
    start,
    attrs,
    end: async (extra = {}, status = "ok") => {
      const end = process.hrtime.bigint();
      await exportSpan(name, start, end, { ...attrs, ...extra, "otel.status": status });
    },
  };
}

async function exportSpan(
  name: string,
  start: bigint,
  end: bigint,
  attrs: Record<string, string | number | boolean>,
) {
  const env = getEnv();
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  const now = BigInt(Date.now()) * BigInt(1_000_000);
  const duration = end - start;
  const startUnix = now - duration;
  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: "service.name", value: { stringValue: "oriel" } }],
        },
        scopeSpans: [
          {
            scope: { name: "oriel" },
            spans: [
              {
                traceId: hexId(16),
                spanId: hexId(8),
                name,
                kind: 1,
                startTimeUnixNano: startUnix.toString(),
                endTimeUnixNano: now.toString(),
                attributes: sanitizeAttrs(attrs),
              },
            ],
          },
        ],
      },
    ],
  };
  try {
    await fetch(new URL("/v1/traces", env.OTEL_EXPORTER_OTLP_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.name : "otel" }, "otel export skipped");
  }
}

export async function flushMetrics() {
  const env = getEnv();
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT || counters.size === 0) return;
  const payload = {
    resourceMetrics: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: "oriel" } }] },
        scopeMetrics: [
          {
            metrics: [...counters.entries()].map(([name, value]) => ({
              name,
              sum: {
                aggregationTemporality: 2,
                isMonotonic: true,
                dataPoints: [{ asInt: String(value), startTimeUnixNano: "0", timeUnixNano: String(Date.now() * 1e6) }],
              },
            })),
          },
        ],
      },
    ],
  };
  try {
    await fetch(new URL("/v1/metrics", env.OTEL_EXPORTER_OTLP_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* honest no-op when collector is down */
  }
}

export function otelConfigured() {
  return Boolean(getEnv().OTEL_EXPORTER_OTLP_ENDPOINT);
}

/** Test helper: attributes that would be dropped. */
export function wouldRedact(key: string) {
  return REDACT_KEYS.has(key.toLowerCase());
}
