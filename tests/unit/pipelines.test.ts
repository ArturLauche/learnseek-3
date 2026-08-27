import { describe, expect, it } from "vitest";
import { jaccard, cosine } from "@/lib/ai/dedup";
import { inspectCodeFile, zipUncompressedTooLarge } from "@/lib/code/inspect";
import { stripSensitive, looksLikeSecret } from "@/lib/pii";
import { inspectAndSanitize } from "@/lib/sandbox/sanitize";
import { heuristicModeration } from "@/lib/ai/provider";

describe("semantic lexical dedup", () => {
  it("scores overlapping titles highly", () => {
    expect(jaccard("base rates at the clinic door", "base rates at the clinic")).toBeGreaterThan(0.5);
    expect(jaccard("photosynthesis electron path", "compound interest curve")).toBeLessThan(0.2);
  });
  it("computes cosine of identical vectors as 1", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });
});

describe("code inspection", () => {
  it("flags private keys and does not execute anything", () => {
    const result = inspectCodeFile("leak.ts", "const key = 'AKIAIOSFODNN7EXAMPLE';");
    expect(result.secrets.length).toBeGreaterThan(0);
  });
  it("rejects oversized zip local-file records", () => {
    const header = Buffer.alloc(30);
    header[0] = 0x50;
    header[1] = 0x4b;
    header[2] = 0x03;
    header[3] = 0x04;
    header.writeUInt32LE(80_000_000, 22);
    expect(zipUncompressedTooLarge(header)).toBe(true);
  });
});

describe("pii stripping", () => {
  it("redacts emails and keys", () => {
    const out = stripSensitive("write to ada@example.com with api_key=sk-abcdefghijklmnopqrstuvwxyz");
    expect(out).not.toContain("ada@example.com");
    expect(looksLikeSecret("api_key=secretvalue")).toBe(true);
  });
});

describe("sandbox sanitize", () => {
  it("strips scripts from html", () => {
    const result = inspectAndSanitize("html", `<p>ok</p><script>document.cookie</script>`);
    expect(result.html).not.toContain("script");
  });
  it("rejects jsx with eval", () => {
    expect(inspectAndSanitize("jsx", "eval('x')").ok).toBe(false);
  });
});

describe("heuristic moderation", () => {
  it("rejects credential dumps", () => {
    expect(heuristicModeration("here is AKIAIOSFODNN7EXAMPLE leak").outcome).toBe("auto_reject");
  });
});
