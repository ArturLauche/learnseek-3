import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedArtifacts } from "@/lib/db/schema";
import { getObjectText } from "@/lib/storage-read";
import { getEnv } from "@/lib/env";
import { SANDBOX_CSP, wrapSandboxDocument } from "@/lib/sandbox/document";
import { allowedParentOrigin, frameAncestorsHeader } from "@/lib/sandbox/origins";
import { logger } from "@/lib/logger";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function send(res: http.ServerResponse, status: number, body: string, headers: Record<string, string>) {
  res.writeHead(status, headers);
  res.end(body);
}

function securityHeaders(csp: string): Record<string, string> {
  return {
    "Content-Security-Policy": csp,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
}

async function main() {
  const env = getEnv();
  const port = Number(process.env.SANDBOX_PORT ?? 3001);
  const appUrl = env.APP_URL;
  const extra = env.APP_ORIGIN ? [env.APP_ORIGIN] : [];
  const csp = SANDBOX_CSP(frameAncestorsHeader(appUrl, extra));
  const runtimePath = path.join(process.cwd(), "public/sandbox-runtime.js");
  const cssPath = path.join(process.cwd(), "public/sandbox.css");

  const server = http.createServer(async (req, res) => {
    const host = req.headers.host ?? `127.0.0.1:${port}`;
    const url = new URL(req.url ?? "/", `http://${host}`);

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "method not allowed", securityHeaders(csp));
      return;
    }

    if (url.pathname === "/health") {
      send(res, 200, JSON.stringify({ service: "oriel-sandbox", ok: true }), {
        ...securityHeaders(csp),
        "Content-Type": "application/json; charset=utf-8",
      });
      return;
    }

    if (url.pathname === "/sandbox-runtime.js") {
      const body = fs.readFileSync(runtimePath, "utf8");
      send(res, 200, body, {
        ...securityHeaders(csp),
        "Content-Type": "text/javascript; charset=utf-8",
        "Cache-Control": "no-store",
      });
      return;
    }

    if (url.pathname === "/sandbox.css") {
      const body = fs.readFileSync(cssPath, "utf8");
      send(res, 200, body, {
        ...securityHeaders(csp),
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "no-store",
      });
      return;
    }

    const match = url.pathname.match(/^\/sandbox\/([^/]+)$/);
    if (!match) {
      send(res, 404, "not found", securityHeaders(csp));
      return;
    }

    const artifactId = match[1] ?? "";
    if (!UUID.test(artifactId)) {
      send(res, 404, "not found", securityHeaders(csp));
      return;
    }

    try {
      const [artifact] = await db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.id, artifactId))
        .limit(1);
      if (!artifact || artifact.compileState !== "compiled" || !artifact.compiledObjectKey) {
        send(res, 404, "Not compiled", securityHeaders(csp));
        return;
      }
      const body = await getObjectText(artifact.compiledObjectKey);
      const parent = allowedParentOrigin(url.searchParams.get("parent"), appUrl, extra);
      const html = wrapSandboxDocument({ body, parentOrigin: parent });
      send(res, 200, html, {
        ...securityHeaders(csp),
        "Content-Type": "text/html; charset=utf-8",
      });
    } catch (error) {
      logger.error({ err: error }, "sandbox host failed");
      send(res, 500, "sandbox error", securityHeaders(csp));
    }
  });

  server.listen(port, "0.0.0.0", () => {
    logger.info({ port, appUrl, sandboxOrigin: env.SANDBOX_ORIGIN }, "oriel sandbox host listening");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
