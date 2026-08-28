export const SANDBOX_CSP = (frameAncestors: string) =>
  [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'none'",
    "connect-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");

export function wrapSandboxDocument(params: {
  body: string;
  parentOrigin: string;
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
}): string {
  const parent = encodeURIComponent(params.parentOrigin);
  const lang = params.lang ?? "en";
  const dir = params.dir ?? "auto";
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Oriel sandbox</title>
  <link rel="stylesheet" href="/sandbox.css"/>
  <script src="/sandbox-runtime.js?parent=${parent}" defer></script>
</head>
<body>
  <main id="oriel-root">${params.body}</main>
  <noscript><p>This learning scene needs JavaScript for interactive controls. The surrounding page includes a text fallback.</p></noscript>
</body>
</html>`;
}
