import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { scanStatusEnum, sourceTypeEnum, uploadKindEnum } from "./enums";
import { createdAt, deletedAt, timestamptz, updatedAt } from "./helpers";

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    canonicalUrl: text("canonical_url"),
    sourceType: sourceTypeEnum("source_type").notNull().default("url"),
    publisher: text("publisher"),
    publishedAt: timestamptz("published_at"),
    license: text("license"),
    qualityScore: real("quality_score").notNull().default(0.5),
    isBlocked: boolean("is_blocked").notNull().default(false),
    notes: text("notes"),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [index("sources_url_idx").on(table.canonicalUrl)],
);

export const sourceAuthors = pgTable("source_authors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  url: text("url"),
  createdAt,
});

export const sourceAuthorLinks = pgTable(
  "source_author_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => sourceAuthors.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("source_author_links_uidx").on(table.sourceId, table.authorId)],
);

export const uploads = pgTable(
  "uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: uploadKindEnum("kind").notNull(),
    originalFilename: text("original_filename"),
    mimeType: text("mime_type"),
    byteSize: integer("byte_size"),
    objectKey: text("object_key"),
    sourceUrl: text("source_url"),
    rightsConfirmed: boolean("rights_confirmed").notNull().default(false),
    isPrivate: boolean("is_private").notNull().default(true),
    language: text("language"),
    status: text("status").notNull().default("uploaded"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [index("uploads_owner_idx").on(table.ownerUserId), index("uploads_status_idx").on(table.status)],
);

export const uploadAssets = pgTable(
  "upload_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    durationMs: integer("duration_ms"),
    createdAt,
  },
  (table) => [index("upload_assets_upload_idx").on(table.uploadId)],
);

export const transcripts = pgTable("transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  uploadId: uuid("upload_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "cascade" }),
  language: text("language"),
  fullText: text("full_text"),
  model: text("model"),
  createdAt,
});

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transcriptId: uuid("transcript_id")
      .notNull()
      .references(() => transcripts.id, { onDelete: "cascade" }),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    speaker: text("speaker"),
  },
  (table) => [index("transcript_segments_idx").on(table.transcriptId)],
);

export const codeFiles = pgTable(
  "code_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    language: text("language"),
    byteSize: integer("byte_size"),
    sha256: text("sha256"),
    licenseDetected: text("license_detected"),
    createdAt,
  },
  (table) => [index("code_files_upload_idx").on(table.uploadId)],
);

export const scanResults = pgTable(
  "scan_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploadId: uuid("upload_id")
      .notNull()
      .references(() => uploads.id, { onDelete: "cascade" }),
    scanner: text("scanner").notNull(),
    status: scanStatusEnum("status").notNull(),
    findings: jsonb("findings").$type<Record<string, unknown>>().notNull().default({}),
    createdAt,
  },
  (table) => [index("scan_results_upload_idx").on(table.uploadId)],
);
