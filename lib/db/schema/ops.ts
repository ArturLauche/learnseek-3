import { boolean, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { notificationChannelEnum } from "./enums";
import { createdAt, timestamptz, updatedAt } from "./helpers";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    channel: notificationChannelEnum("channel").notNull().default("in_app"),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: timestamptz("read_at"),
    createdAt,
  },
  (table) => [index("notifications_user_idx").on(table.userId, table.readAt)],
);

export const administratorActions = pgTable("administrator_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: text("actor_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt,
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorType: text("actor_type").notNull().default("user"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    policyVersion: text("policy_version"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt,
  },
  (table) => [index("audit_events_created_idx").on(table.createdAt), index("audit_events_action_idx").on(table.action)],
);

export const featureFlags = pgTable("feature_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  enabled: boolean("enabled").notNull().default(false),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt,
  updatedAt,
});

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href"),
  startsAt: timestamptz("starts_at"),
  endsAt: timestamptz("ends_at"),
  createdAt,
});

export const policyConfigs = pgTable("policy_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  version: text("version").notNull(),
  body: jsonb("body").$type<Record<string, unknown>>().notNull(),
  createdAt,
});

export const recoControls = pgTable("reco_controls", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  topicWeights: jsonb("topic_weights").$type<Record<string, number>>().notNull().default({}),
  explorationPercent: jsonb("exploration_percent").$type<number>().notNull().default(15),
  diversityLimits: jsonb("diversity_limits").$type<Record<string, number>>().notNull().default({}),
  freshnessDecay: jsonb("freshness_decay").$type<number>().notNull().default(0.02),
  blockedSourceIds: text("blocked_source_ids").array().notNull().default([]),
  qualityThreshold: jsonb("quality_threshold").$type<number>().notNull().default(0.3),
  emergencyOverride: jsonb("emergency_override").$type<Record<string, unknown>>(),
  createdAt,
  updatedAt,
});

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt,
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_uidx").on(table.userId, table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
  ],
);

export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  channel: notificationChannelEnum("channel").notNull().default("in_app"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt,
  updatedAt,
});

export const importExportJobs = pgTable("import_export_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("queued"),
  objectKey: text("object_key"),
  actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt,
  completedAt: timestamptz("completed_at"),
});

export const retentionRuns = pgTable(
  "retention_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dryRun: boolean("dry_run").notNull().default(true),
    status: text("status").notNull().default("queued"),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    finishedAt: timestamptz("finished_at"),
    counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
    policySnapshot: jsonb("policy_snapshot").$type<Record<string, unknown>>().notNull().default({}),
    errorSafe: text("error_safe"),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt,
  },
  (table) => [index("retention_runs_started_idx").on(table.startedAt)],
);
