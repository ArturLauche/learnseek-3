export const ALLOWLISTED_IMPORTS = [
  "@appica/ui-react/button",
  "@appica/ui-react/badge",
  "@appica/ui-react/card",
  "@appica/ui-react/progress",
  "@appica/ui-react/input",
  "@oriel/learning/quiz",
  "@oriel/learning/flashcard",
  "@oriel/learning/timeline",
] as const;

export const FORBIDDEN_PATTERNS = [
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
  /document\.domain/,
];

export function inspectSource(source: string): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) reasons.push(`forbidden:${pattern}`);
  }
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of imports) {
    if (!ALLOWLISTED_IMPORTS.includes(spec as (typeof ALLOWLISTED_IMPORTS)[number])) {
      reasons.push(`import:${spec}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export const SANDBOX_MESSAGE_TYPES = ["completion", "answer", "score", "height", "restart"] as const;
export type SandboxMessageType = (typeof SANDBOX_MESSAGE_TYPES)[number];
