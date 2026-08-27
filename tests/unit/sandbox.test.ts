import { describe, expect, it } from "vitest";
import { inspectSource } from "@/lib/sandbox/boundary";

describe("sandbox inspect", () => {
  it("allows schema-friendly appica imports", () => {
    const src = `import { Button } from "@appica/ui-react/button"; export function Scene(){ return <Button>Ok</Button> }`;
    expect(inspectSource(src).ok).toBe(true);
  });
  it("forbids eval, parent access, and arbitrary imports", () => {
    expect(inspectSource("eval('x')").ok).toBe(false);
    expect(inspectSource("window.parent.location = '/'").ok).toBe(false);
    expect(inspectSource("import fs from 'fs'").ok).toBe(false);
  });
});
