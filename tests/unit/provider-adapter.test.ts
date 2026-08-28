import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { ProviderError, heuristicModeration } from "@/lib/ai/provider";
import { isAiConfigured } from "@/lib/env";

describe("provider adapter", () => {
  it("marks retryable circuit errors", () => {
    const error = new ProviderError("AI provider circuit open", undefined, true);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe("ProviderError");
  });

  it("falls back to heuristic when classifying spam", () => {
    expect(heuristicModeration("hello world").outcome).toBe("auto_approve");
    expect(heuristicModeration("click here to claim prize crypto giveaway guaranteed").outcome).toBe("hold");
  });

  it("exposes configuration honestly", () => {
    expect(typeof isAiConfigured()).toBe("boolean");
  });
});
