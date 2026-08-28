import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userByokCredentials } from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { decryptSecret } from "@/lib/crypto/secrets";

export type ProviderCredentials = {
  baseUrl: string;
  apiKey: string;
  providerName: string;
  model?: string;
  source: "byok" | "env";
};

export async function resolveProviderCredentials(
  userId?: string | null,
): Promise<ProviderCredentials | null> {
  const env = getEnv();
  if (userId) {
    const [row] = await db
      .select()
      .from(userByokCredentials)
      .where(
        and(eq(userByokCredentials.userId, userId), isNull(userByokCredentials.revokedAt)),
      )
      .limit(1);
    if (row) {
      return {
        baseUrl: row.baseUrl,
        apiKey: decryptSecret(row.keyCiphertext, env.ENCRYPTION_KEY),
        providerName: row.providerName,
        model: row.model ?? undefined,
        source: "byok",
      };
    }
  }
  if (env.AI_BASE_URL && env.AI_API_KEY) {
    return {
      baseUrl: env.AI_BASE_URL,
      apiKey: env.AI_API_KEY,
      providerName: env.AI_PROVIDER_NAME,
      model: env.AI_MODEL,
      source: "env",
    };
  }
  return null;
}

export function envAiConfigured() {
  const env = getEnv();
  return Boolean(env.AI_BASE_URL && env.AI_API_KEY);
}
