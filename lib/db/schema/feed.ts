import {
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
import { contentItems } from "./content";
import { feedInteractionKindEnum } from "./enums";
import { createdAt, timestamptz } from "./helpers";

export const feedQueues = pgTable(
  "feed_queues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    anonymousKey: text("anonymous_key"),
    targetSize: integer("target_size").notNull().default(15),
    minSize: integer("min_size").notNull().default(10),
    createdAt,
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("feed_queues_user_uidx").on(table.userId),
    uniqueIndex("feed_queues_anon_uidx").on(table.anonymousKey),
  ],
);

export const feedQueueItems = pgTable(
  "feed_queue_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => feedQueues.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    preparedPayload: jsonb("prepared_payload").$type<Record<string, unknown>>().notNull().default({}),
    rankingFactors: jsonb("ranking_factors").$type<Record<string, number | string>>().notNull().default({}),
    policyDecisions: jsonb("policy_decisions").$type<string[]>().notNull().default([]),
    modelVersion: text("model_version"),
    servedAt: timestamptz("served_at"),
    createdAt,
  },
  (table) => [
    index("feed_queue_items_queue_idx").on(table.queueId, table.position),
    uniqueIndex("feed_queue_items_unique_pending").on(table.queueId, table.contentItemId),
  ],
);

export const feedImpressions = pgTable(
  "feed_impressions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    anonymousKey: text("anonymous_key"),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    queueItemId: uuid("queue_item_id").references(() => feedQueueItems.id, {
      onDelete: "set null",
    }),
    rankingFactors: jsonb("ranking_factors").$type<Record<string, number | string>>(),
    createdAt,
  },
  (table) => [
    index("feed_impressions_user_idx").on(table.userId, table.createdAt),
    index("feed_impressions_item_idx").on(table.contentItemId),
  ],
);

export const feedInteractions = pgTable(
  "feed_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    anonymousKey: text("anonymous_key"),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    kind: feedInteractionKindEnum("kind").notNull(),
    value: real("value"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt,
  },
  (table) => [
    index("feed_interactions_user_idx").on(table.userId, table.createdAt),
    index("feed_interactions_item_kind_idx").on(table.contentItemId, table.kind),
  ],
);

export const recommendations = pgTable("recommendations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  contentItemId: uuid("content_item_id")
    .notNull()
    .references(() => contentItems.id, { onDelete: "cascade" }),
  score: real("score").notNull(),
  reasonCodes: text("reason_codes").array().notNull().default([]),
  modelVersion: text("model_version"),
  createdAt,
});

export const searches = pgTable(
  "searches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    query: text("query").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
    resultCount: integer("result_count").notNull().default(0),
    createdAt,
  },
  (table) => [index("searches_user_idx").on(table.userId)],
);
