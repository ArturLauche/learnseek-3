import { describe, expect, it } from "vitest";
import { directionForLanguages } from "@/lib/i18n/dir";
import { preferStructuredScene } from "@/lib/sandbox/scene-policy";
import { SANDBOX_CSP } from "@/lib/sandbox/document";

describe("direction", () => {
  it("uses rtl for arabic and hebrew", () => {
    expect(directionForLanguages(["ar"])).toBe("rtl");
    expect(directionForLanguages(["he-IL"])).toBe("rtl");
    expect(directionForLanguages(["en"])).toBe("ltr");
  });
});

describe("structured scenes", () => {
  it("keeps jsx only when schema cannot represent the experience", () => {
    const jsx = preferStructuredScene({
      kind: "jsx",
      fallbackText: "Custom interaction that schema cannot express well",
      schema: { jsx: "import { Button } from \"@appica/ui-react/button\"; export function Scene(){ return <Button>Go</Button> }" },
    });
    expect(jsx.kind).toBe("jsx");
    const empty = preferStructuredScene({
      kind: "jsx",
      fallbackText: "Fallback prose for a missing jsx body here",
      schema: {},
    });
    expect(empty.kind).toBe("schema");
  });
});

describe("sandbox CSP", () => {
  it("does not allow connect or same-origin weakening", () => {
    const csp = SANDBOX_CSP("http://localhost:3000");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors http://localhost:3000");
    expect(csp).not.toContain("allow-same-origin");
  });
});
