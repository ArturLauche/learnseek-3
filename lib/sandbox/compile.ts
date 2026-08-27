import { spawn } from "node:child_process";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generatedArtifacts, learningScenes } from "@/lib/db/schema";
import { putObject } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import { renderSceneHtml } from "./schema-html";
import { inspectAndSanitize } from "./sanitize";
import { logger } from "@/lib/logger";

const CHILD = path.join(process.cwd(), "worker/compile-child.mjs");

function runChild(payload: unknown, timeoutMs = 4000): Promise<{ ok: boolean; html?: string; reasons?: string[] }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--max-old-space-size=64", CHILD], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("compile_timeout"));
    }, timeoutMs);
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
      if (out.length > 250_000) {
        child.kill("SIGKILL");
        reject(new Error("compile_output_limit"));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(err || `compile_exit_${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as { ok: boolean; html?: string; reasons?: string[] });
      } catch {
        reject(new Error("compile_parse"));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export async function compileArtifact(artifactId: string) {
  const [artifact] = await db
    .select()
    .from(generatedArtifacts)
    .where(eq(generatedArtifacts.id, artifactId))
    .limit(1);
  if (!artifact) throw new Error("artifact_missing");

  await db
    .update(generatedArtifacts)
    .set({ compileState: "compiling", updatedAt: new Date() })
    .where(eq(generatedArtifacts.id, artifactId));

  let source = artifact.originalCode ?? "";
  let kind: "html" | "jsx" | "schema" = "html";
  if (artifact.sceneId) {
    const [scene] = await db
      .select()
      .from(learningScenes)
      .where(eq(learningScenes.id, artifact.sceneId))
      .limit(1);
    if (scene) {
      kind = scene.kind;
      if (scene.kind === "schema") {
        source = renderSceneHtml(scene.schema, scene.fallbackText ?? "");
        kind = "html";
      } else {
        source = scene.kind === "html" ? (scene.fallbackText ?? "") : (artifact.originalCode ?? "");
        if (!source && scene.fallbackText) source = scene.fallbackText;
      }
    }
  }

  const local = inspectAndSanitize(kind === "jsx" ? "jsx" : "html", source);
  if (!local.ok) {
    await db
      .update(generatedArtifacts)
      .set({
        compileState: "rejected",
        validation: { reasons: local.reasons },
        updatedAt: new Date(),
      })
      .where(eq(generatedArtifacts.id, artifactId));
    return { ok: false, reasons: local.reasons };
  }

  let childResult: { ok: boolean; html?: string; reasons?: string[] };
  try {
    childResult = await runChild({ kind, source: local.html });
  } catch (error) {
    logger.error({ err: error, artifactId }, "compile child failed");
    await db
      .update(generatedArtifacts)
      .set({ compileState: "failed", validation: { error: "child" }, updatedAt: new Date() })
      .where(eq(generatedArtifacts.id, artifactId));
    return { ok: false, reasons: ["child_failed"] };
  }

  if (!childResult.ok || !childResult.html) {
    await db
      .update(generatedArtifacts)
      .set({
        compileState: "rejected",
        validation: { reasons: childResult.reasons ?? ["rejected"] },
        updatedAt: new Date(),
      })
      .where(eq(generatedArtifacts.id, artifactId));
    return { ok: false, reasons: childResult.reasons ?? ["rejected"] };
  }

  const hash = sha256(childResult.html);
  const key = `artifacts/${artifactId}.html`;
  await putObject({ key, body: childResult.html, contentType: "text/html; charset=utf-8" });
  await db
    .update(generatedArtifacts)
    .set({
      compileState: "compiled",
      compiledObjectKey: key,
      compiledHash: hash,
      validation: { ok: true, bytes: childResult.html.length },
      updatedAt: new Date(),
    })
    .where(eq(generatedArtifacts.id, artifactId));
  return { ok: true, hash, key };
}
