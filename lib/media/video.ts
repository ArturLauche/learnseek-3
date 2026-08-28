import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transcriptSegments, transcripts, uploadAssets, uploads } from "@/lib/db/schema";
import { putObject } from "@/lib/storage";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { moderateSubmission } from "@/lib/moderation/pipeline";
import { enqueueTracked } from "@/lib/jobs";
import { ffmpegAvailable, runFfmpeg, runFfprobe } from "./ffmpeg";
import { logger } from "@/lib/logger";
import { resolveProviderCredentials } from "@/lib/ai/credentials";

export function detectLanguage(text: string): string {
  const sample = text.slice(0, 2500);
  if (/[äöüß]/.test(sample) || /\b(und|nicht|der|die|das|ein)\b/i.test(sample)) return "de";
  if (/[àâçéèêëîïôùû]/i.test(sample) || /\b(le|la|les|une|est)\b/i.test(sample)) return "fr";
  if (/[ñáéíóúü]/i.test(sample) && /\b(que|los|las|una)\b/i.test(sample)) return "es";
  return "en";
}

export function parseSilenceChapters(stderr: string): { startMs: number; endMs: number; label: string }[] {
  const starts: number[] = [];
  for (const match of stderr.matchAll(/silence_start:\s*([0-9.]+)/g)) {
    starts.push(Math.round(Number(match[1]) * 1000));
  }
  const chapters = starts.slice(0, 12).map((startMs, index) => ({
    startMs,
    endMs: starts[index + 1] ?? startMs + 30_000,
    label: `Chapter ${index + 1}`,
  }));
  return chapters;
}

export async function processVideoUpload(params: {
  uploadId: string;
  ownerUserId: string;
  bytes: Buffer;
  filename: string;
  mimeType: string;
}) {
  const available = await ffmpegAvailable();
  if (!available) {
    logger.warn({ uploadId: params.uploadId }, "ffmpeg missing; recording metadata-only");
    await db
      .update(uploads)
      .set({
        metadata: { ffmpeg: "missing", note: "Install ffmpeg or use the Docker image." },
        updatedAt: new Date(),
      })
      .where(eq(uploads.id, params.uploadId));
    const transcription = await transcribeAudio({
      bytes: params.bytes,
      filename: params.filename,
      mimeType: params.mimeType,
      credentials: await resolveProviderCredentials(params.ownerUserId),
    });
    if (transcription.text) {
      await persistTranscript(params.uploadId, transcription.text, transcription.model, detectLanguage(transcription.text));
    }
    return { ok: true, ffmpeg: false };
  }

  const dir = path.join(os.tmpdir(), "oriel-media", params.uploadId);
  await mkdir(dir, { recursive: true });
  const inputPath = path.join(dir, "input.bin");
  await writeFile(inputPath, params.bytes);

  const probe = await runFfprobe(inputPath);
  const durationSec = Number(probe.format?.duration ?? 0);
  const width = Number(probe.streams?.find((s) => s.codec_type === "video")?.width ?? 0);
  const height = Number(probe.streams?.find((s) => s.codec_type === "video")?.height ?? 0);

  const transcoded = path.join(dir, "transcode.mp4");
  await runFfmpeg(
    ["-y", "-i", inputPath, "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-c:a", "aac", "-movflags", "+faststart", transcoded],
    120_000,
  );
  try {
    const mp4 = await readFile(transcoded);
    const key = `uploads/${params.ownerUserId}/${params.uploadId}/transcode.mp4`;
    await putObject({ key, body: mp4, contentType: "video/mp4" });
    await db.insert(uploadAssets).values({
      uploadId: params.uploadId,
      kind: "transcode",
      objectKey: key,
      mimeType: "video/mp4",
      width,
      height,
      durationMs: Math.round(durationSec * 1000),
    });
  } catch {
    logger.warn({ uploadId: params.uploadId }, "transcode output missing");
  }

  const thumbPath = path.join(dir, "thumb.jpg");
  const thumbTime = Math.max(0.1, durationSec * 0.1);
  await runFfmpeg(["-y", "-ss", String(thumbTime), "-i", inputPath, "-frames:v", "1", thumbPath]);
  await storeFrame(params, thumbPath, "thumbnail");

  for (const fraction of [0.25, 0.5, 0.75]) {
    const framePath = path.join(dir, `frame-${fraction}.jpg`);
    await runFfmpeg([
      "-y",
      "-ss",
      String(Math.max(0.1, durationSec * fraction)),
      "-i",
      inputPath,
      "-frames:v",
      "1",
      framePath,
    ]);
    await storeFrame(params, framePath, `frame-${fraction}`);
  }

  const audioPath = path.join(dir, "audio.wav");
  await runFfmpeg(["-y", "-i", inputPath, "-vn", "-ac", "1", "-ar", "16000", audioPath]);
  try {
    const wav = await readFile(audioPath);
    const key = `uploads/${params.ownerUserId}/${params.uploadId}/audio.wav`;
    await putObject({ key, body: wav, contentType: "audio/wav" });
    await db.insert(uploadAssets).values({
      uploadId: params.uploadId,
      kind: "audio",
      objectKey: key,
      mimeType: "audio/wav",
    });
    const transcription = await transcribeAudio({
      bytes: wav,
      filename: "audio.wav",
      mimeType: "audio/wav",
      credentials: await resolveProviderCredentials(params.ownerUserId),
    });
    const language = transcription.text ? detectLanguage(transcription.text) : "und";
    if (transcription.text) {
      await persistTranscript(params.uploadId, transcription.text, transcription.model, language);
      await moderateSubmission({ uploadId: params.uploadId, text: transcription.text, safetyClass: "general" });
    }
  } catch {
    logger.warn({ uploadId: params.uploadId }, "audio extract skipped");
  }

  const silence = await runFfmpeg(["-y", "-i", inputPath, "-af", "silencedetect=noise=-30dB:d=0.7", "-f", "null", "-"]);
  const chapters = parseSilenceChapters(silence.stderr);

  await db
    .update(uploads)
    .set({
      language: probe.format?.tags?.language as string | undefined,
      metadata: {
        durationSec,
        width,
        height,
        chapters,
        probe: { formatName: probe.format?.format_name },
      },
      updatedAt: new Date(),
    })
    .where(eq(uploads.id, params.uploadId));

  await enqueueTracked({
    queue: "generation",
    kind: "topic_detect",
    data: { uploadId: params.uploadId, filename: params.filename },
    userId: params.ownerUserId,
    dedupeKey: `topic-upload:${params.uploadId}`,
  });
  await enqueueTracked({
    queue: "embedding",
    kind: "index_upload",
    data: { uploadId: params.uploadId },
    userId: params.ownerUserId,
    dedupeKey: `embed-upload:${params.uploadId}`,
  });
  await enqueueTracked({
    queue: "moderation",
    kind: "video_frames",
    data: { uploadId: params.uploadId, text: `video upload ${params.filename}` },
    userId: params.ownerUserId,
    dedupeKey: `mod-video:${params.uploadId}`,
  });

  return { ok: true, ffmpeg: true, durationSec, chapters: chapters.length };
}

async function storeFrame(
  params: { uploadId: string; ownerUserId: string },
  filePath: string,
  kind: string,
) {
  try {
    const jpeg = await readFile(filePath);
    const key = `uploads/${params.ownerUserId}/${params.uploadId}/${kind}.jpg`;
    await putObject({ key, body: jpeg, contentType: "image/jpeg" });
    await db.insert(uploadAssets).values({
      uploadId: params.uploadId,
      kind,
      objectKey: key,
      mimeType: "image/jpeg",
    });
  } catch {
    /* frame may be missing on very short clips */
  }
}

async function persistTranscript(uploadId: string, text: string, model: string, language: string) {
  const [transcript] = await db
    .insert(transcripts)
    .values({ uploadId, language, fullText: text, model })
    .returning();
  if (transcript) {
    await db.insert(transcriptSegments).values({
      transcriptId: transcript.id,
      startMs: 0,
      endMs: 0,
      text,
    });
  }
}

