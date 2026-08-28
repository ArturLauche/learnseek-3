import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";
import { putObject, ensureBucket } from "@/lib/storage";
import { enqueueTracked } from "@/lib/jobs";
import { z } from "zod";
import { rateLimitRequest } from "@/lib/rate-limit";

const MAX_BYTES = 25 * 1024 * 1024;

const jsonSchema = z.object({
  kind: z.enum(["text", "markdown", "url", "document", "pdf", "source_code", "archive", "audio", "video", "image"]),
  text: z.string().max(100_000).optional(),
  sourceUrl: z.string().url().optional(),
  rightsConfirmed: z.literal(true),
  filename: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const limited = await rateLimitRequest({ userId: session.user.id, scope: "upload" });
  if (!limited.ok) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  const contentType = request.headers.get("content-type") ?? "";
  await ensureBucket();

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const rights = form.get("rightsConfirmed");
    if (rights !== "true" && rights !== "on") {
      return NextResponse.json({ error: "Rights confirmation is required" }, { status: 400 });
    }
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "document");
    const sourceUrl = form.get("sourceUrl") ? String(form.get("sourceUrl")) : undefined;
    let objectKey: string | undefined;
    let mimeType: string | undefined;
    let byteSize: number | undefined;
    let filename: string | undefined;
    if (file instanceof File) {
      if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
      const bytes = Buffer.from(await file.arrayBuffer());
      filename = file.name;
      mimeType = file.type;
      byteSize = bytes.length;
      objectKey = `uploads/${session.user.id}/${crypto.randomUUID()}/${file.name}`;
      await putObject({ key: objectKey, body: bytes, contentType: file.type || "application/octet-stream" });
    }
    const [upload] = await db
      .insert(uploads)
      .values({
        ownerUserId: session.user.id,
        kind: kind as never,
        originalFilename: filename,
        mimeType,
        byteSize,
        objectKey,
        sourceUrl,
        rightsConfirmed: true,
        isPrivate: true,
        status: "uploaded",
      })
      .returning();
    if (!upload) return NextResponse.json({ error: "Could not store upload" }, { status: 500 });
    await enqueueTracked({
      queue: "media",
      kind: "process_upload",
      data: { uploadId: upload.id },
      userId: session.user.id,
      dedupeKey: `upload:${upload.id}`,
    });
    await enqueueTracked({
      queue: "scan",
      kind: "scan_upload",
      data: { uploadId: upload.id },
      userId: session.user.id,
      dedupeKey: `scan:${upload.id}`,
    });
    return NextResponse.json({ ok: true, uploadId: upload.id });
  }

  const parsed = jsonSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  let objectKey: string | undefined;
  if (parsed.data.text) {
    objectKey = `uploads/${session.user.id}/${crypto.randomUUID()}.txt`;
    await putObject({
      key: objectKey,
      body: parsed.data.text,
      contentType: "text/plain; charset=utf-8",
    });
  }
  const [upload] = await db
    .insert(uploads)
    .values({
      ownerUserId: session.user.id,
      kind: parsed.data.kind,
      originalFilename: parsed.data.filename,
      objectKey,
      sourceUrl: parsed.data.sourceUrl,
      rightsConfirmed: true,
      isPrivate: true,
      status: "uploaded",
      metadata: parsed.data.text ? { bytes: parsed.data.text.length } : {},
    })
    .returning();
  if (!upload) return NextResponse.json({ error: "Could not store upload" }, { status: 500 });
  await enqueueTracked({
    queue: "media",
    kind: "process_upload",
    data: { uploadId: upload.id },
    userId: session.user.id,
    dedupeKey: `upload:${upload.id}`,
  });
  return NextResponse.json({ ok: true, uploadId: upload.id });
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { eq, desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(uploads)
    .where(eq(uploads.ownerUserId, session.user.id))
    .orderBy(desc(uploads.createdAt))
    .limit(50);
  return NextResponse.json({
    uploads: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      filename: row.originalFilename,
      status: row.status,
      isPrivate: row.isPrivate,
      createdAt: row.createdAt,
    })),
  });
}
