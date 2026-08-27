#!/usr/bin/env node
/**
 * Isolated compile child. No app imports, no network, no eval.
 * Reads JSON { kind, source } from stdin, writes JSON { ok, html, reasons } to stdout.
 */
import { createHash } from "node:crypto";

const FORBIDDEN = [
  /from\s+['"]fs['"]/,
  /from\s+['"]node:/,
  /from\s+['"]next\//,
  /process\.env/,
  /eval\s*\(/,
  /new\s+Function/,
  /WebAssembly/,
  /localStorage/,
  /document\.cookie/,
  /window\.parent/,
  /parent\.document/,
  /document\.domain/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /navigator\.sendBeacon/,
  /WebSocket/,
  /indexedDB/,
  /sessionStorage/,
  /while\s*\(\s*true/,
  /for\s*\(\s*;\s*;/,
];

function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "");
}

function inspect(source) {
  const reasons = [];
  for (const pattern of FORBIDDEN) {
    if (pattern.test(source)) reasons.push(`forbidden:${pattern}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const allow = [
    "@appica/ui-react/button",
    "@appica/ui-react/badge",
    "@appica/ui-react/card",
    "@appica/ui-react/progress",
    "@appica/ui-react/input",
    "@oriel/learning/quiz",
    "@oriel/learning/flashcard",
    "@oriel/learning/timeline",
  ];
  for (const spec of imports) {
    if (!allow.includes(spec)) reasons.push(`import:${spec}`);
  }
  if (source.length > 200000) reasons.push("oversized");
  return reasons;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
  if (raw.length > 250000) {
    process.stdout.write(JSON.stringify({ ok: false, reasons: ["input_limit"] }));
    process.exit(1);
  }
});
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(raw);
    const source = String(payload.source ?? "");
    const reasons = inspect(source);
    if (reasons.length) {
      process.stdout.write(JSON.stringify({ ok: false, reasons }));
      process.exit(0);
    }
    const html = sanitize(source);
    createHash("sha256").update(html).digest("hex");
    process.stdout.write(JSON.stringify({ ok: true, html }));
  } catch {
    process.stdout.write(JSON.stringify({ ok: false, reasons: ["parse"] }));
    process.exit(1);
  }
});
