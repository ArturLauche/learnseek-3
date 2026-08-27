import { FORBIDDEN_PATTERNS, inspectSource } from "./boundary";

export function sanitizeHtml(input: string): string {
  let html = input;
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed[\s\S]*?>/gi, "");
  html = html.replace(/<link[\s\S]*?>/gi, "");
  html = html.replace(/<meta[\s\S]*?>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  html = html.replace(/javascript:/gi, "");
  html = html.replace(/data:text\/html/gi, "");
  html = html.replace(/srcdoc=/gi, "data-dropped-srcdoc=");
  return html;
}

export function inspectAndSanitize(kind: "html" | "jsx" | "schema", source: string) {
  if (kind === "jsx") {
    const inspected = inspectSource(source);
    if (!inspected.ok) return { ok: false as const, reasons: inspected.reasons, html: "" };
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source) && kind !== "schema") {
      return { ok: false as const, reasons: [`forbidden:${pattern}`], html: "" };
    }
  }
  const html = sanitizeHtml(source);
  if (html.length > 200_000) {
    return { ok: false as const, reasons: ["oversized"], html: "" };
  }
  return { ok: true as const, reasons: [] as string[], html };
}
