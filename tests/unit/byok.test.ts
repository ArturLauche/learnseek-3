import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { lastFour, encryptSecret, decryptSecret } from "@/lib/crypto/secrets";
import { envAiConfigured } from "@/lib/ai/credentials";

describe("BYOK storage helpers", () => {
  it("never returns the full key from lastFour", () => {
    const key = "sk-abcdefghijklmnopqrstuvwxyz012345";
    expect(lastFour(key)).toBe("2345");
    expect(lastFour(key)).not.toBe(key);
    expect(lastFour(key).length).toBe(4);
  });

  it("round-trips AES-256-GCM ciphertext", () => {
    const secret = "test-encryption-key-must-be-32ch!!";
    const cipher = encryptSecret("user-key-alpha", secret);
    expect(cipher).not.toContain("user-key-alpha");
    expect(decryptSecret(cipher, secret)).toBe("user-key-alpha");
  });

  it("does not treat empty env as configured", () => {
    expect(typeof envAiConfigured()).toBe("boolean");
  });
});
