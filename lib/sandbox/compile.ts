import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { artifactVersions, generatedArtifacts, learningScenes } from "@/lib/db/schema";
import { putObject } from "@/lib/storage";
import { sha256 } from "@/lib/hash";
import { renderSceneHtml } from "./schema-html";
import { inspectSource } from "./compiler.mjs";
import { runCompileChild } from "./spawn";
import { logger } from "@/lib/logger";

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

  let source = artifact.originalCode ?? artifact.source ?? "";
  let kind: "html" | "jsx" = "html";
  if (artifact.sceneId) {
    const [scene] = await db
      .select()
      .from(learningScenes)
      .where(eq(learningScenes.id, artifact.sceneId))
      .limit(1);
    if (scene) {
      if (scene.kind === "schema") {
        source = renderSceneHtml(scene.schema, scene.fallbackText ?? "");
        kind = "html";
      } else if (scene.kind === "jsx") {
        kind = "jsx";
        source = String(scene.schema.jsx ?? scene.schema.code ?? artifact.originalCode ?? "");
      } else {
        kind = "html";
        source = String(scene.schema.html ?? scene.fallbackText ?? artifact.originalCode ?? "");
      }
    }
  } else if (looksLikeJsx(source)) {
    kind = "jsx";
  }

  const inspected = inspectSource(source);
  if (!inspected.ok) {
    await persistFailure(artifact, "rejected", { reasons: inspected.reasons });
    return { ok: false, reasons: inspected.reasons };
  }

  let childResult: { ok: boolean; html?: string; reasons?: string[] };
  try {
    childResult = await runCompileChild({ kind, source });
  } catch (error) {
    logger.error({ err: error, artifactId }, "compile child failed");
    await persistFailure(artifact, "failed", { error: "child" });
    return { ok: false, reasons: ["child_failed"] };
  }

  if (!childResult.ok || !childResult.html) {
    const reasons = childResult.reasons ?? ["rejected"];
    await persistFailure(artifact, "rejected", { reasons });
    return { ok: false, reasons };
  }

  const hash = sha256(childResult.html);
  const versionNumber = await nextVersion(artifact.id);
  const key = `artifacts/${artifact.id}/v${versionNumber}.html`;
  await putObject({ key, body: childResult.html, contentType: "text/html; charset=utf-8" });

  const validation = {
    ok: true,
    bytes: childResult.html.length,
    compiledIn: "compile-child",
    version: versionNumber,
  };

  await db
    .update(generatedArtifacts)
    .set({
      compileState: "compiled",
      compiledObjectKey: key,
      compiledHash: hash,
      originalCode: source,
      validation,
      updatedAt: new Date(),
    })
    .where(eq(generatedArtifacts.id, artifactId));

  await db.insert(artifactVersions).values({
    artifactId: artifact.id,
    versionNumber,
    originalCode: source,
    compiledHash: hash,
    compiledObjectKey: key,
    promptRedacted: artifact.promptRedacted,
    modelId: artifact.modelId,
    validation,
    moderation: (artifact.validation as { moderation?: Record<string, unknown> } | null)?.moderation ?? {},
  });

  return { ok: true, hash, key, versionNumber };
}

function looksLikeJsx(source: string) {
  return /<[A-Z][A-Za-z0-9]*[\s/>]/.test(source) || /from\s+['"]@appica\//.test(source);
}

async function nextVersion(artifactId: string) {
  const [row] = await db
    .select({ n: sql<number>`coalesce(max(${artifactVersions.versionNumber}), 0)` })
    .from(artifactVersions)
    .where(eq(artifactVersions.artifactId, artifactId));
  return Number(row?.n ?? 0) + 1;
}

async function persistFailure(
  artifact: typeof generatedArtifacts.$inferSelect,
  compileState: "rejected" | "failed",
  validation: Record<string, unknown>,
) {
  await db
    .update(generatedArtifacts)
    .set({ compileState, validation, updatedAt: new Date() })
    .where(eq(generatedArtifacts.id, artifact.id));
}
