import {
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
import { visibilityEnum } from "./enums";
import { createdAt, deletedAt, timestamptz, updatedAt } from "./helpers";

export const learningPaths = pgTable(
  "learning_paths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    objectives: text("objectives").array().notNull().default([]),
    estimatedMinutes: integer("estimated_minutes").notNull().default(20),
    visibility: visibilityEnum("visibility").notNull().default("public"),
    ownerUserId: text("owner_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [uniqueIndex("learning_paths_slug_uidx").on(table.slug)],
);

export const pathSections = pgTable(
  "path_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pathId: uuid("path_id")
      .notNull()
      .references(() => learningPaths.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull().default(0),
    prerequisiteSectionId: uuid("prerequisite_section_id"),
    createdAt,
  },
  (table) => [index("path_sections_path_idx").on(table.pathId)],
);

export const pathItems = pgTable(
  "path_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => pathSections.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => [uniqueIndex("path_items_uidx").on(table.sectionId, table.contentItemId)],
);

export const progressRecords = pgTable(
  "progress_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    pathId: uuid("path_id").references(() => learningPaths.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("started"),
    seconds: integer("seconds").notNull().default(0),
    completedAt: timestamptz("completed_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("progress_user_idx").on(table.userId),
    index("progress_item_idx").on(table.contentItemId),
  ],
);

export const quizzes = pgTable("quizzes", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id, {
    onDelete: "cascade",
  }),
  pathSectionId: uuid("path_section_id").references(() => pathSections.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  createdAt,
  updatedAt,
});

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    choices: jsonb("choices").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation"),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("quiz_questions_quiz_idx").on(table.quizId)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<number[]>().notNull().default([]),
    score: real("score").notNull().default(0),
    createdAt,
  },
  (table) => [index("quiz_attempts_user_idx").on(table.userId)],
);

export const spacedRepetitionCards = pgTable(
  "spaced_repetition_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    dueAt: timestamptz("due_at").notNull(),
    intervalDays: integer("interval_days").notNull().default(1),
    ease: real("ease").notNull().default(2.5),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("sr_cards_uidx").on(table.userId, table.contentItemId)],
);
