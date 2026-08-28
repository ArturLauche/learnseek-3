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
import { depthEnum, knowledgeLevelEnum, toneEnum } from "./enums";
import { createdAt, deletedAt, timestamptz, updatedAt } from "./helpers";

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt,
}, (table) => [uniqueIndex("roles_slug_uidx").on(table.slug)]);

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull(),
  description: text("description"),
  createdAt,
}, (table) => [uniqueIndex("permissions_slug_uidx").on(table.slug)]);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt,
  },
  (table) => [uniqueIndex("role_permissions_uidx").on(table.roleId, table.permissionId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantedByUserId: text("granted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt,
  },
  (table) => [
    uniqueIndex("user_roles_uidx").on(table.userId, table.roleId),
    index("user_roles_user_idx").on(table.userId),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    websiteUrl: text("website_url"),
    location: text("location"),
    avatarObjectKey: text("avatar_object_key"),
    contributionStats: jsonb("contribution_stats")
      .$type<{
        publishedItems: number;
        followers: number;
        following: number;
        collections: number;
      }>()
      .notNull()
      .default({ publishedItems: 0, followers: 0, following: 0, collections: 0 }),
    moderationNote: text("moderation_note"),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [uniqueIndex("profiles_user_uidx").on(table.userId)],
);

export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    goals: text("goals").array().notNull().default([]),
    knowledgeLevel: knowledgeLevelEnum("knowledge_level").notNull().default("new"),
    depth: depthEnum("depth").notNull().default("standard"),
    formats: text("formats").array().notNull().default([]),
    sessionLengthSeconds: integer("session_length_seconds").notNull().default(120),
    tone: toneEnum("tone").notNull().default("warm"),
    languages: text("languages").array().notNull().default(["en"]),
    professionalInterests: text("professional_interests").array().notNull().default([]),
    avoidTopics: text("avoid_topics").array().notNull().default([]),
    weeklyGoalMinutes: integer("weekly_goal_minutes").notNull().default(60),
    hideStreak: boolean("hide_streak").notNull().default(false),
    streakGraceDays: integer("streak_grace_days").notNull().default(2),
    explorationPercent: integer("exploration_percent").notNull().default(15),
    onboardingVersion: integer("onboarding_version").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("preferences_user_uidx").on(table.userId)],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(false),
    pushEnabled: boolean("push_enabled").notNull().default(false),
    followedCreators: boolean("followed_creators").notNull().default(true),
    pathReminders: boolean("path_reminders").notNull().default(true),
    moderationUpdates: boolean("moderation_updates").notNull().default(true),
    dailySuggestions: boolean("daily_suggestions").notNull().default(true),
    collectionActivity: boolean("collection_activity").notNull().default(true),
    frequency: text("frequency").notNull().default("daily"),
    quietHoursStart: text("quiet_hours_start"),
    quietHoursEnd: text("quiet_hours_end"),
    timezone: text("timezone"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("notification_preferences_user_uidx").on(table.userId)],
);

export const userByokCredentials = pgTable(
  "user_byok_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerName: text("provider_name").notNull(),
    baseUrl: text("base_url").notNull(),
    keyCiphertext: text("key_ciphertext").notNull(),
    keyLastFour: text("key_last_four").notNull(),
    model: text("model"),
    createdAt,
    updatedAt,
    revokedAt: deletedAt,
  },
  (table) => [uniqueIndex("user_byok_user_provider_uidx").on(table.userId, table.providerName)],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    granted: boolean("granted").notNull(),
    version: text("version").notNull(),
    createdAt,
    revokedAt: deletedAt,
  },
  (table) => [index("consent_user_idx").on(table.userId, table.kind)],
);

export const creators = pgTable(
  "creators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    slug: text("slug").notNull(),
    bio: text("bio"),
    verifiedAt: timestamptz("verified_at"),
    status: text("status").notNull().default("active"),
    createdAt,
    updatedAt,
    deletedAt,
  },
  (table) => [
    uniqueIndex("creators_user_uidx").on(table.userId),
    uniqueIndex("creators_slug_uidx").on(table.slug),
  ],
);

export const dataExportRequests = pgTable("data_export_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  objectKey: text("object_key"),
  createdAt,
  completedAt: deletedAt,
});

export const deletionRequests = pgTable("deletion_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  reason: text("reason"),
  createdAt,
  processedAt: deletedAt,
});

export const progressSummaries = pgTable(
  "progress_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    minutesLearned: integer("minutes_learned").notNull().default(0),
    itemsCompleted: integer("items_completed").notNull().default(0),
    pathsCompleted: integer("paths_completed").notNull().default(0),
    quizAccuracy: real("quiz_accuracy"),
    currentStreakDays: integer("current_streak_days").notNull().default(0),
    lastActiveDate: text("last_active_date"),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("progress_summaries_user_uidx").on(table.userId)],
);
