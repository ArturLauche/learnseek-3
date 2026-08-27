import { getEnv, isAiConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { providerRequests } from "@/lib/db/schema";
import { learningItemSchema, moderationResultSchema, type LearningItemDraft, type ModerationResult } from "./schemas";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  constructor(
    private readonly threshold = 5,
    private readonly resetMs = 30_000,
  ) {}
  get open() {
    if (this.openedAt && Date.now() - this.openedAt > this.resetMs) {
      this.failures = 0;
      this.openedAt = null;
    }
    return this.openedAt !== null;
  }
  success() {
    this.failures = 0;
    this.openedAt = null;
  }
  fail() {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = Date.now();
  }
}

const breaker = new CircuitBreaker();
let inFlight = 0;

async function withConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  const env = getEnv();
  while (inFlight >= env.AI_MAX_CONCURRENCY) {
    await new Promise((r) => setTimeout(r, 50));
  }
  inFlight += 1;
  try {
    return await fn();
  } finally {
    inFlight -= 1;
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export type ProviderHealth = {
  configured: boolean;
  reachable: boolean;
  latencyMs: number | null;
  circuitOpen: boolean;
  providerName: string;
};

export async function checkProviderHealth(): Promise<ProviderHealth> {
  const env = getEnv();
  if (!isAiConfigured() || !env.AI_BASE_URL) {
    return {
      configured: false,
      reachable: false,
      latencyMs: null,
      circuitOpen: breaker.open,
      providerName: env.AI_PROVIDER_NAME,
    };
  }
  const started = Date.now();
  try {
    const response = await fetch(new URL("/models", env.AI_BASE_URL), {
      headers: env.AI_API_KEY ? { Authorization: `Bearer ${env.AI_API_KEY}` } : {},
      signal: AbortSignal.timeout(Math.min(env.AI_REQUEST_TIMEOUT_MS, 5000)),
    });
    return {
      configured: true,
      reachable: response.ok || response.status === 401,
      latencyMs: Date.now() - started,
      circuitOpen: breaker.open,
      providerName: env.AI_PROVIDER_NAME,
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      latencyMs: Date.now() - started,
      circuitOpen: breaker.open,
      providerName: env.AI_PROVIDER_NAME,
    };
  }
}

async function chatCompletion(params: {
  model: string;
  messages: ChatMessage[];
  jsonSchema?: Record<string, unknown>;
  purpose: string;
  jobId?: string;
}): Promise<string> {
  const env = getEnv();
  if (!env.AI_BASE_URL || !env.AI_API_KEY) {
    throw new ProviderError("AI provider is not configured");
  }
  if (breaker.open) {
    throw new ProviderError("AI provider circuit open", undefined, true);
  }

  return withConcurrency(async () => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const started = Date.now();
      try {
        const body: Record<string, unknown> = {
          model: params.model,
          messages: params.messages,
          temperature: 0.4,
        };
        if (env.AI_SUPPORTS_JSON_SCHEMA && params.jsonSchema) {
          body.response_format = {
            type: "json_schema",
            json_schema: { name: "oriel_item", schema: params.jsonSchema, strict: true },
          };
        } else {
          body.response_format = { type: "json_object" };
        }
        const response = await fetch(new URL("/chat/completions", env.AI_BASE_URL), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
        });
        const latencyMs = Date.now() - started;
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          await db.insert(providerRequests).values({
            jobId: params.jobId,
            providerName: env.AI_PROVIDER_NAME,
            model: params.model,
            purpose: params.purpose,
            status: "error",
            latencyMs,
            errorSafe: `http_${response.status}`,
          });
          if (retryable) {
            breaker.fail();
            await sleep(2 ** attempt * 400);
            continue;
          }
          throw new ProviderError(`Provider HTTP ${response.status}`, response.status);
        }
        const json = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const content = json.choices?.[0]?.message?.content;
        if (!content) throw new ProviderError("Empty provider response");
        breaker.success();
        await db.insert(providerRequests).values({
          jobId: params.jobId,
          providerName: env.AI_PROVIDER_NAME,
          model: params.model,
          purpose: params.purpose,
          status: "ok",
          latencyMs,
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
        });
        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("unknown");
        breaker.fail();
        logger.warn({ attempt, purpose: params.purpose, err: lastError.message }, "provider request failed");
        await sleep(2 ** attempt * 400);
      }
    }
    throw lastError ?? new ProviderError("Provider request failed");
  });
}

export async function generateLearningItem(input: {
  topic: string;
  format?: string;
  knowledgeLevel?: string;
  language?: string;
  avoid?: string[];
}): Promise<LearningItemDraft> {
  const env = getEnv();
  const raw = await chatCompletion({
    model: env.AI_MODEL,
    purpose: "generate_item",
    messages: [
      {
        role: "system",
        content:
          "You generate original microlearning items for Oriel. Never copy commercial summary products. Cite public sources. Return JSON only. Strip personal data.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });
  return learningItemSchema.parse(JSON.parse(raw));
}

export async function moderateText(text: string): Promise<ModerationResult> {
  const env = getEnv();
  if (!isAiConfigured()) {
    return heuristicModeration(text);
  }
  try {
    const raw = await chatCompletion({
      model: env.AI_MODERATION_MODEL || env.AI_FAST_MODEL,
      purpose: "moderation",
      messages: [
        {
          role: "system",
          content:
            "Classify content for safety. Categories: harassment, hate, sexual, violence, self-harm, dangerous, illegal, spam, scam, impersonation, privacy, pii, malware, credentials, manipulated_media, misinformation, plagiarism, copyright. Return JSON.",
        },
        { role: "user", content: text.slice(0, 8000) },
      ],
    });
    return moderationResultSchema.parse(JSON.parse(raw));
  } catch {
    return heuristicModeration(text);
  }
}

export function heuristicModeration(text: string): ModerationResult {
  const lowered = text.toLowerCase();
  const flagged =
    /\b(kill yourself|credit card\s*\d{12}|api[_-]?key\s*[:=])\b/.test(lowered) ||
    /\bAKIA[0-9A-Z]{16}\b/.test(text);
  if (flagged) {
    return {
      outcome: "auto_reject",
      categories: [{ category: "credentials", confidence: 0.9 }],
      priority: 0.9,
      notes: "heuristic",
    };
  }
  return {
    outcome: "auto_approve",
    categories: [],
    priority: 0.1,
    notes: "heuristic_fallback",
  };
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  const env = getEnv();
  if (!env.AI_BASE_URL || !env.AI_API_KEY) return null;
  try {
    const response = await fetch(new URL("/embeddings", env.AI_BASE_URL), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: env.AI_EMBEDDING_MODEL, input: texts }),
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: { embedding: number[] }[] };
    return json.data?.map((row) => row.embedding) ?? null;
  } catch {
    return null;
  }
}
