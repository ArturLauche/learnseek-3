import { index, integer, jsonb, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { contentItems } from "./content";
import { jobStatusEnum } from "./enums";
import { createdAt, timestamptz, updatedAt } from "./helpers";

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    queueName: text("queue_name").notNull(),
    bullmqJobId: text("bullmq_job_id"),
    kind: text("kind").notNull(),
    status: jobStatusEnum("status").notNull().default("queued"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>(),
    errorSafe: text("error_safe"),
    attempts: integer("attempts").notNull().default(0),
    createdAt,
    updatedAt,
    completedAt: timestamptz("completed_at"),
  },
  (table) => [
    index("generation_jobs_status_idx").on(table.status, table.kind),
    index("generation_jobs_user_idx").on(table.userId),
  ],
);

export const providerRequests = pgTable(
  "provider_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").references(() => generationJobs.id, { onDelete: "set null" }),
    providerName: text("provider_name").notNull(),
    model: text("model").notNull(),
    purpose: text("purpose").notNull(),
    status: text("status").notNull(),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCostUsd: real("estimated_cost_usd"),
    errorSafe: text("error_safe"),
    createdAt,
  },
  (table) => [index("provider_requests_created_idx").on(table.createdAt)],
);

export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  purpose: text("purpose").notNull(),
  body: text("body").notNull(),
  schemaVersion: text("schema_version").notNull().default("1"),
  createdAt,
  updatedAt,
});
