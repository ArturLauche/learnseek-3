import { index, jsonb, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { contentItems } from "./content";
import { appealStatusEnum, moderationOutcomeEnum, reportStatusEnum } from "./enums";
import { createdAt, timestamptz, updatedAt } from "./helpers";
import { uploads } from "./media";

export const reportCategories = pgTable("report_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt,
});

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterUserId: text("reporter_user_id").references(() => user.id, { onDelete: "set null" }),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => reportCategories.id, {
      onDelete: "set null",
    }),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("open"),
    createdAt,
    updatedAt,
  },
  (table) => [index("reports_status_idx").on(table.status)],
);

export const moderationCases = pgTable(
  "moderation_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, {
      onDelete: "cascade",
    }),
    uploadId: uuid("upload_id").references(() => uploads.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("open"),
    priority: real("priority").notNull().default(0.5),
    recommendedAction: moderationOutcomeEnum("recommended_action"),
    assignedToUserId: text("assigned_to_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    policyVersion: text("policy_version"),
    createdAt,
    updatedAt,
    resolvedAt: timestamptz("resolved_at"),
  },
  (table) => [index("moderation_cases_status_idx").on(table.status, table.priority)],
);

export const moderationFindings = pgTable(
  "moderation_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => moderationCases.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    confidence: real("confidence").notNull(),
    evidenceRefs: jsonb("evidence_refs").$type<string[]>().notNull().default([]),
    model: text("model"),
    createdAt,
  },
  (table) => [index("moderation_findings_case_idx").on(table.caseId)],
);

export const appeals = pgTable("appeals", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => moderationCases.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  statement: text("statement").notNull(),
  status: appealStatusEnum("status").notNull().default("open"),
  createdAt,
  updatedAt,
  resolvedAt: timestamptz("resolved_at"),
});

export const takedownRequests = pgTable("takedown_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id, {
    onDelete: "set null",
  }),
  claimantName: text("claimant_name").notNull(),
  claimantEmail: text("claimant_email").notNull(),
  details: text("details").notNull(),
  status: text("status").notNull().default("open"),
  createdAt,
  updatedAt,
});
