import { describe, expect, it } from "vitest";
import { wrapSandboxDocument } from "@/lib/sandbox/document";
import {
  allowedAppOrigins,
  allowedParentOrigin,
  frameAncestorsHeader,
  originsAreDistinct,
} from "@/lib/sandbox/origins";

describe("sandbox parent origins", () => {
  it("allows APP_URL and optional APP_ORIGIN, never a mismatched host", () => {
    expect(allowedParentOrigin("https://app.example.com", "https://app.example.com")).toBe("https://app.example.com");
    expect(allowedParentOrigin("https://evil.example", "https://app.example.com")).toBe("");
    expect(allowedParentOrigin("http://localhost:3000", "https://app.example.com")).toBe("");
    expect(allowedParentOrigin("https://www.example.com", "https://app.example.com", ["https://www.example.com"])).toBe(
      "https://www.example.com",
    );
  });

  it("does not invent localhost ancestors for production hosts", () => {
    expect(allowedAppOrigins("https://app.example.com")).toEqual(["https://app.example.com"]);
    expect(frameAncestorsHeader("https://app.example.com")).not.toMatch(/localhost|127\.0\.0\.1/);
    expect(originsAreDistinct("https://app.example.com", "https://sandbox.example.com")).toBe(true);
    expect(originsAreDistinct("https://app.example.com", "https://app.example.com")).toBe(false);
  });

  it("maps localhost to 127.0.0.1 only in local dev", () => {
    const origins = allowedAppOrigins("http://localhost:3000");
    expect(origins).toContain("http://localhost:3000");
    expect(origins).toContain("http://127.0.0.1:3000");
  });

  it("omits a mismatched parent from the sandbox document", () => {
    const html = wrapSandboxDocument({ body: "<p>ok</p>", parentOrigin: "" });
    expect(html).toContain("sandbox-runtime.js?parent=");
    expect(html).not.toContain("evil.example");
  });
});
