import { describe, expect, it } from "vitest";
import { wouldRedact } from "@/lib/otel";

describe("otel redaction", () => {
  it("drops secrets, prompts, and private content keys", () => {
    expect(wouldRedact("apiKey")).toBe(true);
    expect(wouldRedact("prompt")).toBe(true);
    expect(wouldRedact("fullText")).toBe(true);
    expect(wouldRedact("keyCiphertext")).toBe(true);
    expect(wouldRedact("smtp_password")).toBe(true);
    expect(wouldRedact("VAPID_PRIVATE_KEY")).toBe(true);
    expect(wouldRedact("purpose")).toBe(false);
    expect(wouldRedact("latencyMs")).toBe(false);
  });
});
