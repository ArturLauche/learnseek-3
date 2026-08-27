export {
  ALLOWLISTED_IMPORTS,
  FORBIDDEN_PATTERNS,
  LIMITS,
  compileGeneratedSource,
  inspectAndSanitize,
  inspectGeneratedSource,
  inspectSource,
  sanitizeHtml,
} from "./compiler.mjs";

export type CompilePayload = { kind?: "html" | "jsx" | "schema"; source: string };
export type CompileResult = { ok: boolean; html?: string; reasons: string[] };
