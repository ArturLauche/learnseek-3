import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { ProviderCredentials } from "./credentials";

export async function transcribeAudio(params: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
  credentials?: ProviderCredentials | null;
}): Promise<{ text: string | null; model: string; skipped?: string }> {
  const env = getEnv();
  const base = env.AI_TRANSCRIPTION_BASE_URL || params.credentials?.baseUrl || env.AI_BASE_URL;
  const key = env.AI_TRANSCRIPTION_API_KEY || params.credentials?.apiKey || env.AI_API_KEY;
  if (!base || !key) {
    return { text: null, model: env.AI_TRANSCRIPTION_MODEL, skipped: "unconfigured" };
  }
  try {
    const form = new FormData();
    form.set("model", env.AI_TRANSCRIPTION_MODEL);
    form.set("file", new Blob([new Uint8Array(params.bytes)], { type: params.mimeType }), params.filename);
    const response = await fetch(new URL("/audio/transcriptions", base), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, "transcription http error");
      return { text: null, model: env.AI_TRANSCRIPTION_MODEL, skipped: `http_${response.status}` };
    }
    const json = (await response.json()) as { text?: string };
    return { text: json.text ?? null, model: env.AI_TRANSCRIPTION_MODEL };
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.name : "error" }, "transcription failed");
    return { text: null, model: env.AI_TRANSCRIPTION_MODEL, skipped: "error" };
  }
}
