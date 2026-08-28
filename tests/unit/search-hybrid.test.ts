import { describe, expect, it } from "vitest";
import { reciprocalRankFusion, vectorLiteral } from "@/lib/search/hybrid";
import { canRetryJob } from "@/lib/jobs/retry-policy";
import { isQueueName } from "@/lib/queue";

describe("hybrid rank fusion", () => {
  it("merges FTS and kNN ids with reciprocal rank fusion, not keyword fake-outs", () => {
    const merged = reciprocalRankFusion(["fts-only", "both"], ["knn-only", "both"]);
    expect(merged[0]).toBe("both");
    expect(merged).toContain("fts-only");
    expect(merged).toContain("knn-only");
  });

  it("rejects non-finite vectors", () => {
    expect(() => vectorLiteral([1, Number.NaN])).toThrow(/invalid_vector/);
    expect(vectorLiteral([1, 0])).toBe("[1,0]");
  });
});

describe("safe job retry", () => {
  it("only retries failed jobs on known queues", () => {
    expect(canRetryJob({ status: "failed", queueName: "generation" }).ok).toBe(true);
    expect(canRetryJob({ status: "failed", queueName: "retention" }).ok).toBe(true);
    expect(canRetryJob({ status: "completed", queueName: "generation" }).ok).toBe(false);
    expect(canRetryJob({ status: "failed", queueName: "not-a-queue" }).ok).toBe(false);
    expect(isQueueName("compile")).toBe(true);
    expect(isQueueName("shell")).toBe(false);
  });
});
