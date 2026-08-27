/**
 * Isolated JSX/HTML compiler. No eval, no Function, no require of app modules.
 * Used by worker/compile-child.mjs inside a stripped-env child process.
 */

export const LIMITS = {
  maxSourceBytes: 80_000,
  maxOutputBytes: 200_000,
  maxInputBytes: 250_000,
  maxNodes: 400,
  maxDepth: 16,
  maxAttrs: 24,
  maxParseSteps: 50_000,
  maxCpuMicros: 1_500_000,
  timeoutMs: 4_000,
  maxHeapMb: 64,
};

export const ALLOWLISTED_IMPORTS = [
  "@appica/ui-react/button",
  "@appica/ui-react/badge",
  "@appica/ui-react/card",
  "@appica/ui-react/progress",
  "@appica/ui-react/input",
  "@oriel/learning/quiz",
  "@oriel/learning/flashcard",
  "@oriel/learning/timeline",
];

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
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  /globalThis/,
  /Function\s*\(/,
  /import\.meta/,
  /child_process/,
  /constructor\s*\[\s*['"]constructor/,
  /__proto__/,
  /document\.write/,
  /\binnerHTML\b/,
  /dangerouslySetInnerHTML/,
  /addEventListener\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /\bpostMessage\s*\(/,
  /javascript:/i,
  /vbscript:/i,
  /data:\s*text\/html/i,
];

const EVENT_ATTR = /(?:^|\s)on[A-Za-z]+\s*=/;
const EVENT_PROP = /\bon[A-Z][A-Za-z]*\s*=/;
const HTML_EVENT = /\son[a-z]+\s*=/i;

const ALLOWED_TAGS = new Set([
  "article",
  "section",
  "header",
  "footer",
  "main",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "span",
  "div",
  "button",
  "pre",
  "code",
  "details",
  "summary",
  "mark",
  "small",
  "blockquote",
  "figure",
  "figcaption",
  "time",
  "abbr",
  "br",
  "hr",
  "progress",
  "img",
  "label",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "progress", "input"]);

const ALLOWED_ATTRS = new Set([
  "id",
  "class",
  "className",
  "title",
  "lang",
  "dir",
  "role",
  "hidden",
  "disabled",
  "type",
  "value",
  "max",
  "min",
  "alt",
  "width",
  "height",
  "tabIndex",
  "tabindex",
  "htmlFor",
  "for",
  "name",
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-live",
  "aria-hidden",
  "aria-expanded",
  "aria-pressed",
  "data-choice",
  "data-correct",
  "data-flip",
  "data-complete",
  "data-restart",
  "data-feedback",
  "data-front",
  "data-back",
  "data-oriel-quiz",
  "data-oriel-card",
  "data-oriel-timeline",
  "data-oriel-compare",
  "data-oriel-code",
  "data-oriel-prose",
  "data-lang",
  "prompt",
  "choices",
  "correctIndex",
  "front",
  "back",
  "events",
  "src",
]);

const COMPONENT_TAGS = {
  Button: "button",
  Badge: "span",
  Card: "article",
  CardHeader: "header",
  CardTitle: "h2",
  CardDescription: "p",
  Progress: "progress",
  Input: "input",
  Quiz: "quiz",
  Flashcard: "flashcard",
  Timeline: "timeline",
};

const IMPORT_TO_COMPONENTS = {
  "@appica/ui-react/button": ["Button"],
  "@appica/ui-react/badge": ["Badge"],
  "@appica/ui-react/card": ["Card", "CardHeader", "CardTitle", "CardDescription"],
  "@appica/ui-react/progress": ["Progress"],
  "@appica/ui-react/input": ["Input"],
  "@oriel/learning/quiz": ["Quiz"],
  "@oriel/learning/flashcard": ["Flashcard"],
  "@oriel/learning/timeline": ["Timeline"],
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeHtml(input) {
  let html = String(input);
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  html = html.replace(/<object[\s\S]*?<\/object>/gi, "");
  html = html.replace(/<embed[\s\S]*?>/gi, "");
  html = html.replace(/<link[\s\S]*?>/gi, "");
  html = html.replace(/<meta[\s\S]*?>/gi, "");
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "");
  html = html.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  html = html.replace(/javascript:/gi, "");
  html = html.replace(/vbscript:/gi, "");
  html = html.replace(/data:text\/html/gi, "");
  html = html.replace(/srcdoc=/gi, "data-dropped-srcdoc=");
  html = html.replace(/\shref\s*=\s*(['"])[^'"]*\1/gi, "");
  html = html.replace(/\s(xlink:href|formaction|action)\s*=\s*(['"])[^'"]*\2/gi, "");
  return html;
}

export function inspectSource(source) {
  const reasons = [];
  const text = String(source ?? "");
  if (text.length > 200_000) reasons.push("oversized");
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) reasons.push(`forbidden:${pattern}`);
  }
  const imports = [...text.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of imports) {
    if (!ALLOWLISTED_IMPORTS.includes(spec)) reasons.push(`import:${spec}`);
  }
  if (EVENT_ATTR.test(text) || EVENT_PROP.test(text) || HTML_EVENT.test(text)) {
    reasons.push("event-handler");
  }
  return { ok: reasons.length === 0, reasons };
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function isSafeDataImage(value) {
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function looksLikeUrl(value) {
  return /^(https?:|wss?:|ftp:|javascript:|vbscript:|file:|data:)/i.test(String(value).trim())
    || /^\/\//.test(String(value).trim());
}

/**
 * @param {string} source
 * @param {"html"|"jsx"} [kind]
 */
export function inspectGeneratedSource(source, kind = "jsx") {
  const inspected = inspectSource(source);
  const reasons = [...inspected.reasons];
  if (source.length > LIMITS.maxSourceBytes) reasons.push("oversized");
  if (kind === "jsx" || kind === "html") {
    const attrUrls = [...source.matchAll(/\s(href|src|action|formaction|poster|xlink:href)\s*=\s*(['"])([\s\S]*?)\2/gi)];
    for (const match of attrUrls) {
      const name = match[1].toLowerCase();
      const value = match[3];
      if (name === "src" && isSafeDataImage(value)) continue;
      if (looksLikeUrl(value) || value.includes("://")) reasons.push(`url:${name}`);
    }
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] };
}

class CompileError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function createParser(source) {
  const cpu0 = process.cpuUsage();
  let i = 0;
  let steps = 0;
  let nodes = 0;

  function bump() {
    steps += 1;
    if (steps > LIMITS.maxParseSteps) throw new CompileError("complexity:steps");
    if (steps % 64 === 0) {
      const used = process.cpuUsage(cpu0);
      if (used.user + used.system > LIMITS.maxCpuMicros) throw new CompileError("complexity:cpu");
    }
  }

  function peek() {
    return source[i] ?? "";
  }

  function eof() {
    return i >= source.length;
  }

  function skipWs() {
    while (!eof() && /[\s]/.test(peek())) {
      bump();
      i += 1;
    }
  }

  function takeWhile(re) {
    const start = i;
    while (!eof() && re.test(peek())) {
      bump();
      i += 1;
    }
    return source.slice(start, i);
  }

  function expect(str) {
    skipWs();
    if (source.slice(i, i + str.length) !== str) throw new CompileError(`syntax:expected:${str}`);
    i += str.length;
    bump();
  }

  function tryEat(str) {
    skipWs();
    if (source.slice(i, i + str.length) === str) {
      i += str.length;
      bump();
      return true;
    }
    return false;
  }

  function parseString() {
    const quote = peek();
    if (quote !== '"' && quote !== "'") throw new CompileError("syntax:string");
    i += 1;
    bump();
    let out = "";
    while (!eof() && peek() !== quote) {
      const ch = peek();
      if (ch === "\\") {
        i += 1;
        out += peek();
        i += 1;
      } else {
        out += ch;
        i += 1;
      }
      bump();
    }
    if (peek() !== quote) throw new CompileError("syntax:unterminated-string");
    i += 1;
    bump();
    return out;
  }

  function parseNumber() {
    const raw = takeWhile(/[0-9.eE+\-]/);
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new CompileError("syntax:number");
    return n;
  }

  function parseIdent() {
    const id = takeWhile(/[A-Za-z0-9_$\-:]/);
    if (!id) throw new CompileError("syntax:ident");
    return id;
  }

  function parseExpr() {
    skipWs();
    if (peek() === '"' || peek() === "'") return parseString();
    if (peek() === "[") return parseArray();
    if (peek() === "{") return parseObject();
    if (/[0-9.\-]/.test(peek())) return parseNumber();
    const id = parseIdent();
    if (id === "true") return true;
    if (id === "false") return false;
    if (id === "null") return null;
    throw new CompileError(`forbidden-expr:${id}`);
  }

  function parseArray() {
    expect("[");
    const items = [];
    skipWs();
    while (!eof() && peek() !== "]") {
      items.push(parseExpr());
      skipWs();
      if (peek() === ",") {
        i += 1;
        bump();
        skipWs();
      }
      if (items.length > 64) throw new CompileError("complexity:array");
    }
    expect("]");
    return items;
  }

  function parseObject() {
    expect("{");
    const obj = {};
    skipWs();
    while (!eof() && peek() !== "}") {
      skipWs();
      let key;
      if (peek() === '"' || peek() === "'") key = parseString();
      else key = parseIdent();
      skipWs();
      expect(":");
      obj[key] = parseExpr();
      skipWs();
      if (peek() === ",") {
        i += 1;
        bump();
      }
      if (Object.keys(obj).length > 32) throw new CompileError("complexity:object");
    }
    expect("}");
    return obj;
  }

  function parseJsxChildren(stopTag) {
    const children = [];
    while (!eof()) {
      bump();
      if (source.slice(i, i + 2) === "</") {
        if (stopTag === null) break;
        const save = i;
        i += 2;
        skipWs();
        const name = takeWhile(/[A-Za-z0-9]/);
        skipWs();
        if (peek() === ">") {
          i += 1;
          if (stopTag !== null && name !== stopTag && stopTag !== "") {
            throw new CompileError(`syntax:mismatch:${stopTag}/${name}`);
          }
          break;
        }
        i = save;
      }
      if (source.slice(i, i + 2) === "<>" || peek() === "<") {
        children.push(parseJsx());
        continue;
      }
      if (peek() === "{") {
        i += 1;
        skipWs();
        if (source.slice(i, i + 2) === "/*") {
          const end = source.indexOf("*/", i);
          if (end < 0) throw new CompileError("syntax:comment");
          i = end + 2;
          skipWs();
          expect("}");
          continue;
        }
        const value = parseExpr();
        skipWs();
        expect("}");
        children.push({ type: "text", value: String(value) });
        continue;
      }
      const start = i;
      while (!eof() && peek() !== "<" && peek() !== "{") {
        i += 1;
        bump();
      }
      const text = source.slice(start, i);
      if (text.length) children.push({ type: "text", value: text });
    }
    return children;
  }

  function parseAttrs() {
    const attrs = {};
    while (!eof()) {
      skipWs();
      if (peek() === "/" || peek() === ">" || eof()) break;
      const name = parseIdent();
      if (name.startsWith("on") && name.length > 2 && name[2] === name[2].toUpperCase()) {
        throw new CompileError(`event:${name}`);
      }
      if (/^on/i.test(name)) throw new CompileError(`event:${name}`);
      if (!ALLOWED_ATTRS.has(name) && !name.startsWith("aria-") && !name.startsWith("data-")) {
        throw new CompileError(`attr:${name}`);
      }
      skipWs();
      let value = true;
      if (peek() === "=") {
        i += 1;
        skipWs();
        if (peek() === '"' || peek() === "'") value = parseString();
        else if (peek() === "{") {
          i += 1;
          value = parseExpr();
          skipWs();
          expect("}");
        } else throw new CompileError("syntax:attr-value");
      }
      if (typeof value === "string" && looksLikeUrl(value) && !(name === "src" && isSafeDataImage(value))) {
        throw new CompileError(`url:${name}`);
      }
      attrs[name] = value;
      if (Object.keys(attrs).length > LIMITS.maxAttrs) throw new CompileError("complexity:attrs");
    }
    return attrs;
  }

  function parseJsx(depth = 0) {
    if (depth > LIMITS.maxDepth) throw new CompileError("complexity:depth");
    nodes += 1;
    if (nodes > LIMITS.maxNodes) throw new CompileError("complexity:nodes");
    skipWs();
    if (tryEat("<>")) {
      const children = parseJsxChildren("");
      return { type: "fragment", children };
    }
    expect("<");
    const name = parseIdent();
    const attrs = parseAttrs();
    skipWs();
    if (tryEat("/>")) {
      return { type: "element", name, attrs, children: [] };
    }
    expect(">");
    if (VOID_TAGS.has(name.toLowerCase())) {
      return { type: "element", name, attrs, children: [] };
    }
    const children = parseJsxChildren(name);
    return { type: "element", name, attrs, children };
  }

  function parseImports() {
    const imported = new Map();
    while (true) {
      skipWs();
      if (!source.slice(i).startsWith("import")) break;
      expect("import");
      skipWs();
      expect("{");
      const names = [];
      while (!eof() && peek() !== "}") {
        skipWs();
        names.push(parseIdent());
        skipWs();
        if (peek() === ",") {
          i += 1;
          bump();
        }
        if (tryEat("as")) throw new CompileError("import-alias");
      }
      expect("}");
      skipWs();
      expect("from");
      skipWs();
      const spec = parseString();
      tryEat(";");
      if (!ALLOWLISTED_IMPORTS.includes(spec)) throw new CompileError(`import:${spec}`);
      const allowed = IMPORT_TO_COMPONENTS[spec] ?? [];
      for (const name of names) {
        if (!allowed.includes(name)) throw new CompileError(`import-symbol:${name}`);
        imported.set(name, spec);
      }
    }
    return imported;
  }

  function parseProgram() {
    skipWs();
    const imported = parseImports();
    skipWs();
    tryEat("export");
    skipWs();
    tryEat("default");
    skipWs();
    if (tryEat("function")) {
      skipWs();
      parseIdent();
      skipWs();
      expect("(");
      skipWs();
      expect(")");
      skipWs();
      expect("{");
      skipWs();
      expect("return");
      skipWs();
      tryEat("(");
      const ast = parseJsx(0);
      skipWs();
      tryEat(")");
      tryEat(";");
      skipWs();
      expect("}");
      return { ast, imported };
    }
    if (peek() === "<") {
      return { ast: parseJsx(0), imported };
    }
    throw new CompileError("syntax:program");
  }

  return { parseProgram, parseJsx };
}

function attrName(name) {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  if (name === "tabIndex") return "tabindex";
  return name;
}

function emitAttrs(attrs) {
  let out = "";
  for (const [raw, value] of Object.entries(attrs ?? {})) {
    if (["prompt", "choices", "correctIndex", "front", "back", "events"].includes(raw)) continue;
    const name = attrName(raw);
    if (value === true) {
      out += ` ${escapeHtml(name)}`;
      continue;
    }
    if (value === false || value == null) continue;
    if (typeof value === "object") throw new CompileError(`attr-object:${raw}`);
    const str = String(value);
    if (looksLikeUrl(str) && !(name === "src" && isSafeDataImage(str))) {
      throw new CompileError(`url:${name}`);
    }
    out += ` ${escapeHtml(name)}="${escapeHtml(str)}"`;
  }
  return out;
}

function textOf(nodes) {
  return (nodes ?? [])
    .filter((n) => n.type === "text")
    .map((n) => n.value)
    .join("")
    .trim();
}

function emitQuiz(attrs, children) {
  const prompt = typeof attrs.prompt === "string" ? attrs.prompt : textOf(children);
  const choices = Array.isArray(attrs.choices) ? attrs.choices.map((c) => String(c)) : [];
  const correct = Number(attrs.correctIndex ?? 0);
  if (!prompt || choices.length < 2) throw new CompileError("quiz-shape");
  const buttons = choices
    .map(
      (choice, index) =>
        `<button type="button" data-choice="${index}" data-correct="${index === correct ? "1" : "0"}" aria-label="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`,
    )
    .join("");
  return `<article data-oriel-quiz><p>${escapeHtml(prompt)}</p><div class="choices">${buttons}</div><p data-feedback hidden aria-live="polite"></p></article>`;
}

function emitFlashcard(attrs) {
  const front = String(attrs.front ?? "");
  const back = String(attrs.back ?? "");
  return `<article data-oriel-card><p data-front>${escapeHtml(front)}</p><p data-back hidden>${escapeHtml(back)}</p><button type="button" data-flip aria-label="Show other side of card">Show other side</button></article>`;
}

function emitTimeline(attrs) {
  const events = Array.isArray(attrs.events) ? attrs.events : [];
  const items = events
    .map((event) => {
      const year = escapeHtml(String(event?.year ?? ""));
      const label = escapeHtml(String(event?.label ?? ""));
      return `<li><time>${year}</time> ${label}</li>`;
    })
    .join("");
  return `<article data-oriel-timeline><ol>${items}</ol></article>`;
}

function emit(node, imported, depth) {
  if (depth > LIMITS.maxDepth) throw new CompileError("complexity:depth");
  if (!node) return "";
  if (node.type === "text") return escapeHtml(node.value);
  if (node.type === "fragment") {
    return (node.children ?? []).map((child) => emit(child, imported, depth + 1)).join("");
  }
  const name = node.name;
  const attrs = node.attrs ?? {};
  if (COMPONENT_TAGS[name]) {
    if (imported && imported.size > 0 && !imported.has(name) && !["CardHeader", "CardTitle", "CardDescription"].includes(name)) {
      throw new CompileError(`undeclared:${name}`);
    }
    if (name === "Quiz") return emitQuiz(attrs, node.children);
    if (name === "Flashcard") return emitFlashcard(attrs);
    if (name === "Timeline") return emitTimeline(attrs);
    const tag = COMPONENT_TAGS[name];
    if (tag === "button" && attrs.type && attrs.type !== "button") throw new CompileError("button-type");
    if (tag === "input") {
      const type = String(attrs.type ?? "text");
      if (!["text", "hidden"].includes(type)) throw new CompileError("input-type");
    }
    const extra = tag === "button" ? ` type="button"` : "";
    const inner = (node.children ?? []).map((child) => emit(child, imported, depth + 1)).join("");
    if (VOID_TAGS.has(tag)) return `<${tag}${extra}${emitAttrs(attrs)}/>`;
    return `<${tag}${extra}${emitAttrs(attrs)}>${inner}</${tag}>`;
  }
  const tag = name.toLowerCase();
  if (tag !== name) throw new CompileError(`unknown-component:${name}`);
  if (!ALLOWED_TAGS.has(tag)) throw new CompileError(`tag:${tag}`);
  if (tag === "img") {
    const src = String(attrs.src ?? "");
    if (!isSafeDataImage(src)) throw new CompileError("url:src");
    if (!attrs.alt) attrs.alt = "";
  }
  if (tag === "button" && !attrs.type) attrs.type = "button";
  const inner = (node.children ?? []).map((child) => emit(child, imported, depth + 1)).join("");
  if (VOID_TAGS.has(tag)) return `<${tag}${emitAttrs(attrs)}/>`;
  return `<${tag}${emitAttrs(attrs)}>${inner}</${tag}>`;
}

function compileJsx(source) {
  const stripped = stripComments(source);
  const parser = createParser(stripped);
  const { ast, imported } = parser.parseProgram();
  return emit(ast, imported, 0);
}

/**
 * Authoritative compile. Intended to run only inside compile-child.
 * @param {{ kind?: string, source: string }} payload
 */
export function compileGeneratedSource(payload) {
  const kind = payload?.kind === "jsx" ? "jsx" : "html";
  const source = String(payload?.source ?? "");
  if (source.length > LIMITS.maxSourceBytes) {
    return { ok: false, reasons: ["oversized"], html: "" };
  }
  const inspected = inspectGeneratedSource(source, kind);
  if (!inspected.ok) return { ok: false, reasons: inspected.reasons, html: "" };

  try {
    let html;
    if (kind === "jsx") html = compileJsx(source);
    else html = sanitizeHtml(source);
    if (html.length > LIMITS.maxOutputBytes) {
      return { ok: false, reasons: ["oversized_output"], html: "" };
    }
    html = sanitizeHtml(html);
    return { ok: true, reasons: [], html };
  } catch (error) {
    const reason = error instanceof CompileError ? error.reason : "compile";
    return { ok: false, reasons: [reason], html: "" };
  }
}

export function inspectAndSanitize(kind, source) {
  if (kind === "schema") {
    return { ok: true, reasons: [], html: sanitizeHtml(source) };
  }
  if (kind === "jsx") {
    const inspected = inspectSource(source);
    if (!inspected.ok) return { ok: false, reasons: inspected.reasons, html: "" };
    return { ok: true, reasons: [], html: "" };
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) {
      return { ok: false, reasons: [`forbidden:${pattern}`], html: "" };
    }
  }
  const html = sanitizeHtml(source);
  if (html.length > 200_000) return { ok: false, reasons: ["oversized"], html: "" };
  return { ok: true, reasons: [], html };
}
