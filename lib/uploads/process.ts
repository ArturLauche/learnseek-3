import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codeFiles,
  scanResults,
  transcriptSegments,
  transcripts,
  uploads,
} from "@/lib/db/schema";
import { getEnv } from "@/lib/env";
import { getObjectBuffer, getObjectText } from "@/lib/storage-read";
import { inspectCodeFile, zipUncompressedTooLarge } from "@/lib/code/inspect";
import { sha256 } from "@/lib/hash";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { moderateSubmission } from "@/lib/moderation/pipeline";
import { logger } from "@/lib/logger";
import { enqueueTracked } from "@/lib/jobs";
import { processVideoUpload } from "@/lib/media/video";
import { resolveProviderCredentials } from "@/lib/ai/credentials";

export async function recordStubScan(uploadId: string, bytes?: Buffer) {
  const env = getEnv();
  if (env.SCANNER_MODE === "clamav" && env.CLAMAV_HOST && bytes) {
    const { clamavScan } = await import("@/lib/scan/clamav");
    const result = await clamavScan(bytes);
    await db.insert(scanResults).values({
      uploadId,
      scanner: "clamav",
      status: result.status === "clean" ? "clean" : result.status === "infected" ? "infected" : "error",
      findings: { detail: result.detail },
    });
    return { scanner: "clamav", status: result.status };
  }
  const scanner = env.SCANNER_MODE === "clamav" ? "clamav" : "stub";
  const status = env.SCANNER_MODE === "clamav" ? "pending" : "skipped_dev_stub";
  await db.insert(scanResults).values({
    uploadId,
    scanner,
    status,
    findings: { mode: env.SCANNER_MODE },
  });
  return { scanner, status };
}

export async function processUpload(uploadId: string) {
  const [upload] = await db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1);
  if (!upload) return { ok: false, reason: "missing" };
  await db.update(uploads).set({ status: "processing", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
  const bytes = upload.objectKey ? await getObjectBuffer(upload.objectKey).catch(() => undefined) : undefined;
  await recordStubScan(uploadId, bytes);

  try {
    if (upload.kind === "text" || upload.kind === "markdown") {
      const text = upload.objectKey ? await getObjectText(upload.objectKey) : String(upload.metadata.text ?? "");
      await db
        .insert(transcripts)
        .values({ uploadId, language: upload.language ?? "en", fullText: text, model: "passthrough" });
      await moderateSubmission({ uploadId, text, safetyClass: "general" });
    }

    if (upload.kind === "url" && upload.sourceUrl) {
      await moderateSubmission({
        uploadId,
        text: `Submitted URL ${upload.sourceUrl}`,
        safetyClass: "general",
      });
    }

    if (upload.kind === "source_code" && upload.objectKey) {
      const buf = await getObjectBuffer(upload.objectKey);
      if (zipUncompressedTooLarge(buf)) {
        await db.insert(scanResults).values({
          uploadId,
          scanner: "archive-guard",
          status: "suspicious",
          findings: { reason: "uncompressed_too_large" },
        });
        await db.update(uploads).set({ status: "rejected", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
        return { ok: false, reason: "archive_bomb" };
      }
      const text = buf.toString("utf8");
      const inspection = inspectCodeFile(upload.originalFilename ?? "file.txt", text);
      await db.insert(codeFiles).values({
        uploadId,
        path: upload.originalFilename ?? "file",
        language: inspection.language,
        byteSize: buf.length,
        sha256: sha256(buf),
        licenseDetected: inspection.licenseHint,
      });
      if (inspection.secrets.length || inspection.malwareHints.length || inspection.executable) {
        await db.insert(scanResults).values({
          uploadId,
          scanner: "static-code",
          status: inspection.executable || inspection.malwareHints.length ? "suspicious" : "clean",
          findings: {
            secrets: inspection.secrets.length,
            malwareHints: inspection.malwareHints,
            executable: inspection.executable,
          },
        });
      }
      await moderateSubmission({
        uploadId,
        text: text.slice(0, 8000),
        safetyClass: "security",
      });
    }

    if (upload.kind === "video" && upload.objectKey) {
      const buf = await getObjectBuffer(upload.objectKey);
      await processVideoUpload({
        uploadId,
        ownerUserId: upload.ownerUserId,
        bytes: buf,
        filename: upload.originalFilename ?? "video.bin",
        mimeType: upload.mimeType ?? "video/mp4",
      });
    } else if (upload.kind === "audio" && upload.objectKey) {
      const buf = await getObjectBuffer(upload.objectKey);
      const credentials = await resolveProviderCredentials(upload.ownerUserId);
      const transcription = await transcribeAudio({
        bytes: buf,
        filename: upload.originalFilename ?? "audio.bin",
        mimeType: upload.mimeType ?? "audio/mpeg",
        credentials,
      });
      if (transcription.text) {
        const [transcript] = await db
          .insert(transcripts)
          .values({
            uploadId,
            language: upload.language,
            fullText: transcription.text,
            model: transcription.model,
          })
          .returning();
        if (transcript) {
          await db.insert(transcriptSegments).values({
            transcriptId: transcript.id,
            startMs: 0,
            endMs: 0,
            text: transcription.text,
          });
        }
        await moderateSubmission({ uploadId, text: transcription.text, safetyClass: "general" });
      }
    }

    await db.update(uploads).set({ status: "processed", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
    await enqueueTracked({
      queue: "embedding",
      kind: "index_upload",
      data: { uploadId },
      userId: upload.ownerUserId,
      dedupeKey: `embed-upload:${uploadId}`,
    });
    return { ok: true };
  } catch (error) {
    logger.error({ err: error, uploadId }, "upload processing failed");
    await db.update(uploads).set({ status: "error", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
    return { ok: false, reason: "error" };
  }
}
