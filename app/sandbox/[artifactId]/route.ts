import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatedArtifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getObjectText } from "@/lib/storage-read";

export const dynamic = "force-dynamic";

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors *; base-uri 'none'; form-action 'none'";

export async function GET(_request: NextRequest, context: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await context.params;
  const [artifact] = await db
    .select()
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.id, artifactId))
    .limit(1);
  if (!artifact || artifact.compileState !== "compiled" || !artifact.compiledObjectKey) {
    return new NextResponse("Not compiled", { status: 404, headers: { "Content-Security-Policy": CSP } });
  }
  const body = await getObjectText(artifact.compiledObjectKey);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Oriel sandbox</title>
  <script src="/sandbox-runtime.js" defer></script>
  <style>
    body { font-family: Georgia, serif; margin: 1rem; color: #222; background: #faf7f0; }
    button { margin: 0.25rem 0.25rem 0 0; padding: 0.4rem 0.7rem; }
    .choices { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  </style>
</head>
<body>${body}</body>
</html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
