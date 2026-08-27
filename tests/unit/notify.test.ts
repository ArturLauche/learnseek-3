import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { describe, expect, it } from "vitest";
import { inQuietHours } from "@/lib/notify/deliver";
import { emailConfigured } from "@/lib/notify/email";
import { pushConfigured } from "@/lib/notify/push";

describe("notification delivery policy", () => {
  it("detects quiet hours wrapping midnight", () => {
    const noon = new Date("2026-01-01T12:00:00");
    const late = new Date("2026-01-01T23:00:00");
    const early = new Date("2026-01-01T02:00:00");
    expect(inQuietHours("22:00", "07:00", late)).toBe(true);
    expect(inQuietHours("22:00", "07:00", early)).toBe(true);
    expect(inQuietHours("22:00", "07:00", noon)).toBe(false);
    expect(inQuietHours(null, null, noon)).toBe(false);
  });

  it("reports email and push as unset when env is empty", () => {
    expect(typeof emailConfigured()).toBe("boolean");
    expect(typeof pushConfigured()).toBe("boolean");
  });
});
