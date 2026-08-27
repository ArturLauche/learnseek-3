import { describe, expect, it } from "vitest";
import { decideOutcome } from "@/lib/moderation/policy";

describe("moderation outcomes", () => {
  it("auto-approves low confidence general content", () => {
    expect(
      decideOutcome({ maxConfidence: 0.1, hasHighRisk: false, safetyClass: "general", mode: "standard" }),
    ).toBe("auto_approve");
  });
  it("holds sensitive classes earlier", () => {
    expect(
      decideOutcome({ maxConfidence: 0.45, hasHighRisk: false, safetyClass: "health", mode: "standard" }),
    ).toBe("hold");
  });
  it("rejects high-risk high-confidence", () => {
    expect(
      decideOutcome({ maxConfidence: 0.95, hasHighRisk: true, safetyClass: "general", mode: "standard" }),
    ).toBe("auto_reject");
  });
});
