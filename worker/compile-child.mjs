#!/usr/bin/env node
/**
 * Isolated compile child. No app imports, no network, no eval, no secrets.
 * Reads JSON { kind, source } from stdin, writes JSON { ok, html, reasons } to stdout.
 */
import { createHash } from "node:crypto";
import { compileGeneratedSource, LIMITS } from "../lib/sandbox/compiler.mjs";

const KEEP = new Set(["PATH", "LANG", "TZ", "TERM", "NODE_ENV", "ORIEL_COMPILE_CHILD"]);
for (const key of Object.keys(process.env)) {
  if (!KEEP.has(key)) delete process.env[key];
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
  if (raw.length > LIMITS.maxInputBytes) {
    process.stdout.write(JSON.stringify({ ok: false, reasons: ["input_limit"] }));
    process.exit(1);
  }
});
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(raw);
    const result = compileGeneratedSource({
      kind: payload.kind === "jsx" ? "jsx" : "html",
      source: String(payload.source ?? ""),
    });
    if (result.ok && result.html) {
      createHash("sha256").update(result.html).digest("hex");
    }
    process.stdout.write(JSON.stringify(result));
    process.exit(result.ok ? 0 : 0);
  } catch {
    process.stdout.write(JSON.stringify({ ok: false, reasons: ["parse"] }));
    process.exit(1);
  }
});
