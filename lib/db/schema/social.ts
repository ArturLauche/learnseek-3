import { index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { contentItems } from "./content";
import { followTargetEnum, reactionKindEnum, visibilityEnum } from "./enums";
import { createdAt, deletedAt, updatedAt } from "./helpers";
import { topics } from "./taxonomy";

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: followTargetEnum("target_type").notNull(),
    targetUserId: text("target_user_id").references(() => user.id, { onDelete: "cascade" }),
    targetTopicId: uuid("target_topic_id").references(() => topics.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [
    index("follows_follower_idx").on(table.followerUserId),
    index("follows_target_user_idx").on(table.targetUserId),
  ],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    slug: text("slug").notNull(),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [
    uniqueIndex("collections_owner_slug_uidx").on(table.ownerUserId, table.slug),
    index("collections_owner_idx").on(table.ownerUserId),
  ],
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt,
  },
  (table) => [uniqueIndex("collection_items_uidx").on(table.collectionId, table.contentItemId)],
);

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [uniqueIndex("saves_uidx").on(table.userId, table.contentItemId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    kind: reactionKindEnum("kind").notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("reactions_uidx").on(table.userId, table.contentItemId, table.kind)],
);
