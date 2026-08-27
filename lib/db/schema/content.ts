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
  vector,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { creators } from "./identity";
import {
  artifactCompileStateEnum,
  contentFormatEnum,
  contentOriginEnum,
  depthEnum,
  generationStateEnum,
  knowledgeLevelEnum,
  moderationStateEnum,
  publicationStateEnum,
  safetyClassEnum,
  sceneKindEnum,
  toneEnum,
  visibilityEnum,
} from "./enums";
import { createdAt, deletedAt, timestamptz, updatedAt } from "./helpers";
import { sources, uploads } from "./media";
import { tags, topics } from "./taxonomy";

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    learningObjective: text("learning_objective").notNull(),
    bodyText: text("body_text").notNull().default(""),
    durationSeconds: integer("duration_seconds").notNull().default(60),
    format: contentFormatEnum("format").notNull(),
    language: text("language").notNull().default("en"),
    difficulty: knowledgeLevelEnum("difficulty").notNull().default("new"),
    depth: depthEnum("depth").notNull().default("standard"),
    tone: toneEnum("tone").notNull().default("warm"),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    origin: contentOriginEnum("origin").notNull().default("editorial"),
    publicationState: publicationStateEnum("publication_state").notNull().default("draft"),
    moderationState: moderationStateEnum("moderation_state").notNull().default("pending"),
    generationState: generationStateEnum("generation_state").notNull().default("idle"),
    safetyClass: safetyClassEnum("safety_class").notNull().default("general"),
    sourceQuality: real("source_quality").notNull().default(0.7),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    creatorId: uuid("creator_id").references(() => creators.id, { onDelete: "set null" }),
    primaryTopicId: uuid("primary_topic_id").references(() => topics.id, { onDelete: "set null" }),
    uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "set null" }),
    currentVersionId: uuid("current_version_id"),
    publishedAt: timestamptz("published_at"),
    scheduledAt: timestamptz("scheduled_at"),
    featuredUntil: timestamptz("featured_until"),
    isReusableFact: boolean("is_reusable_fact").notNull().default(false),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [
    uniqueIndex("content_items_slug_uidx").on(table.slug),
    index("content_items_pub_idx").on(table.publicationState, table.visibility, table.deletedAt),
    index("content_items_topic_idx").on(table.primaryTopicId),
    index("content_items_owner_idx").on(table.ownerUserId),
  ],
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    learningObjective: text("learning_objective").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    contentHash: text("content_hash").notNull(),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    immutable: boolean("immutable").notNull().default(true),
    createdAt,
  },
  (table) => [
    uniqueIndex("content_versions_uidx").on(table.contentItemId, table.versionNumber),
    index("content_versions_hash_idx").on(table.contentHash),
  ],
);

export const learningScenes = pgTable(
  "learning_scenes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => contentVersions.id, { onDelete: "set null" }),
    kind: sceneKindEnum("kind").notNull().default("schema"),
    position: integer("position").notNull().default(0),
    schema: jsonb("schema").$type<Record<string, unknown>>().notNull().default({}),
    fallbackText: text("fallback_text"),
    createdAt,
    updatedAt,
  },
  (table) => [index("learning_scenes_item_idx").on(table.contentItemId)],
);

export const generatedArtifacts = pgTable("generated_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentItemId: uuid("content_item_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  sceneId: uuid("scene_id").references(() => learningScenes.id, { onDelete: "set null" }),
  promptRedacted: text("prompt_redacted"),
  modelId: text("model_id"),
  source: text("source"),
  originalCode: text("original_code"),
  compiledObjectKey: text("compiled_object_key"),
  compiledHash: text("compiled_hash"),
  validation: jsonb("validation").$type<Record<string, unknown>>().notNull().default({}),
  compileState: artifactCompileStateEnum("compile_state").notNull().default("pending"),
  createdAt,
  updatedAt,
});

export const contentItemTopics = pgTable(
  "content_item_topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [uniqueIndex("content_item_topics_uidx").on(table.contentItemId, table.topicId)],
);

export const contentItemTags = pgTable(
  "content_item_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("content_item_tags_uidx").on(table.contentItemId, table.tagId)],
);

export const contentItemSources = pgTable(
  "content_item_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    citation: text("citation"),
    passage: text("passage"),
  },
  (table) => [index("content_item_sources_idx").on(table.contentItemId)],
);

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt,
  },
  (table) => [index("embeddings_item_idx").on(table.contentItemId)],
);
