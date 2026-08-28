import { boolean, index, integer, pgTable, real, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, deletedAt, updatedAt } from "./helpers";

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    parentId: uuid("parent_id"),
    adjacentTopicIds: uuid("adjacent_topic_ids").array().notNull().default([]),
    opposingTopicIds: uuid("opposing_topic_ids").array().notNull().default([]),
    foundationTopicId: uuid("foundation_topic_id"),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [uniqueIndex("topics_slug_uidx").on(table.slug), index("topics_parent_idx").on(table.parentId)],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt,
    deletedAt,
  },
  (table) => [uniqueIndex("tags_slug_uidx").on(table.slug)],
);

export const userTopicPreferences = pgTable(
  "user_topic_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    weight: real("weight").notNull().default(1),
    isHidden: boolean("is_hidden").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("user_topic_prefs_uidx").on(table.userId, table.topicId),
    index("user_topic_prefs_user_idx").on(table.userId),
  ],
);
