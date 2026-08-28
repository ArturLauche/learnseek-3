import { describe, expect, it } from "vitest";
import { inspectSource, FORBIDDEN_PATTERNS } from "@/lib/sandbox/boundary";

describe("sandbox boundary extras", () => {
  it("forbids wasm, function constructor, and cookie access", () => {
    expect(inspectSource("WebAssembly.instantiate(buf)").ok).toBe(false);
    expect(inspectSource("const f = new Function('x','return x')").ok).toBe(false);
    expect(inspectSource("const c = document.cookie").ok).toBe(false);
  });
  it("documents forbidden patterns used by the compile child", () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThan(5);
  });
});
