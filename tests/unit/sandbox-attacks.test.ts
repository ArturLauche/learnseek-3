import { describe, expect, it } from "vitest";
import { inspectSource } from "@/lib/sandbox/boundary";
import { inspectAndSanitize } from "@/lib/sandbox/sanitize";

describe("sandbox attack surface", () => {
  it("blocks cookie, storage, and parent DOM access", () => {
    expect(inspectSource("const c = document.cookie").ok).toBe(false);
    expect(inspectSource("localStorage.setItem('x','y')").ok).toBe(false);
    expect(inspectSource("sessionStorage.clear()").ok).toBe(false);
    expect(inspectSource("window.parent.location = '/'").ok).toBe(false);
    expect(inspectSource("parent.document.body.innerHTML = 'x'").ok).toBe(false);
  });

  it("blocks network, env, and forbidden imports", () => {
    expect(inspectSource("fetch('https://evil.example')").ok).toBe(false);
    expect(inspectSource("new XMLHttpRequest()").ok).toBe(false);
    expect(inspectSource("new WebSocket('wss://x')").ok).toBe(false);
    expect(inspectSource("const k = process.env.SECRET").ok).toBe(false);
    expect(inspectSource("import fs from 'fs'").ok).toBe(false);
    expect(inspectSource("import { spawn } from 'node:child_process'").ok).toBe(false);
  });

  it("blocks infinite loops and oversized output", () => {
    expect(inspectSource("while(true){ }").ok).toBe(false);
    expect(inspectSource("for(;;){ }").ok).toBe(false);
    expect(inspectSource("x".repeat(200_001)).ok).toBe(false);
  });

  it("iframe html cannot keep cookie-stealing handlers", () => {
    const result = inspectAndSanitize("html", `<p onclick="document.cookie">ok</p>`);
    expect(result.html).not.toMatch(/onclick/i);
  });
});
