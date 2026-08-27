import { describe, expect, it } from "vitest";
import { inspectSource, compileGeneratedSource, LIMITS } from "@/lib/sandbox/compiler.mjs";
import { runCompileChild, compileChildEnv } from "@/lib/sandbox/spawn";
import { preferStructuredScene } from "@/lib/sandbox/scene-policy";

const allowedJsx = `import { Button } from "@appica/ui-react/button";
export function Scene() {
  return <Button>Ok</Button>;
}`;

const quizJsx = `import { Quiz } from "@oriel/learning/quiz";
export function Scene() {
  return <Quiz prompt="2+2?" choices={["3", "4"]} correctIndex={1} />;
}`;

describe("isolated compile child", () => {
  it("compiles allowlisted JSX to HTML in a child process", async () => {
    const result = await runCompileChild({ kind: "jsx", source: allowedJsx });
    expect(result.ok).toBe(true);
    expect(result.html).toContain("<button");
    expect(result.html).toContain("Ok");
    expect(result.html).not.toMatch(/onClick/i);
  });

  it("compiles Quiz JSX to labeled buttons", async () => {
    const result = await runCompileChild({ kind: "jsx", source: quizJsx });
    expect(result.ok).toBe(true);
    expect(result.html).toContain("data-oriel-quiz");
    expect(result.html).toContain("data-choice");
    expect(result.html).toContain('aria-label="4"');
  });

  it("rejects forbidden imports, globals, env, network, and parent access", async () => {
    const attacks = [
      "import fs from 'fs'; export function Scene(){ return <p>x</p> }",
      "eval('x')",
      "const k = process.env.SECRET; export function Scene(){ return <p/> }",
      "fetch('https://evil.example')",
      "document.cookie",
      "localStorage.setItem('x','y')",
      "window.parent.location = '/'",
      "parent.document.body.innerHTML = 'x'",
    ];
    for (const source of attacks) {
      const result = await runCompileChild({ kind: "jsx", source });
      expect(result.ok, source).toBe(false);
    }
  });

  it("rejects infinite-loop syntax and oversized source", async () => {
    expect((await runCompileChild({ kind: "jsx", source: "while(true){}" })).ok).toBe(false);
    expect((await runCompileChild({ kind: "jsx", source: "for(;;){}" })).ok).toBe(false);
    expect((await runCompileChild({ kind: "jsx", source: "x".repeat(Number(LIMITS.maxSourceBytes) + 10) })).ok).toBe(
      false,
    );
  });

  it("does not leak parent env secrets into compile output", async () => {
    const previous = process.env.AI_API_KEY;
    process.env.AI_API_KEY = "supersecret-compile-leak-token";
    try {
      const result = await runCompileChild({ kind: "jsx", source: allowedJsx });
      expect(result.ok).toBe(true);
      expect(result.html).not.toContain("supersecret-compile-leak-token");
      expect(compileChildEnv().AI_API_KEY).toBeUndefined();
      expect(compileChildEnv().AUTH_SECRET).toBeUndefined();
      expect(compileChildEnv().DATABASE_URL).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.AI_API_KEY;
      else process.env.AI_API_KEY = previous;
    }
  });

  it("rejects oversized source instead of compiling it", async () => {
    const huge = "x".repeat(Number(LIMITS.maxSourceBytes) + 10);
    const result = await runCompileChild({ kind: "html", source: huge });
    expect(result.ok).toBe(false);
    expect(result.reasons?.some((r) => r.includes("oversized"))).toBe(true);
  });
});

describe("in-process inspect (parse only, not compile)", () => {
  it("allows schema-friendly appica imports", () => {
    expect(inspectSource(allowedJsx).ok).toBe(true);
  });
  it("does not execute jsx in this process", () => {
    const compiled = compileGeneratedSource({ kind: "jsx", source: allowedJsx });
    expect(compiled.ok).toBe(true);
    expect(compiled.html).not.toContain("eval");
  });
});

describe("scene policy prefers schema", () => {
  it("coerces quiz schema away from jsx", () => {
    const out = preferStructuredScene({
      kind: "jsx",
      fallbackText: "A quiz about stacks",
      schema: { type: "quiz", prompt: "Q", choices: ["a", "b"], correctIndex: 0 },
    });
    expect(out.kind).toBe("schema");
  });
});
