import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "warned",
  "suspended",
  "pending_deletion",
  "deleted",
]);

export const visibilityEnum = pgEnum("visibility", ["public", "unlisted", "private"]);

export const contentFormatEnum = pgEnum("content_format", [
  "explanation",
  "practical_lesson",
  "visual_comparison",
  "timeline",
  "worked_example",
  "interactive_quiz",
  "flashcard",
  "code_example",
  "misconception_correction",
  "decision_exercise",
  "short_story",
  "diagram",
  "reflection_prompt",
  "interactive_demo",
]);

export const contentOriginEnum = pgEnum("content_origin", [
  "editorial",
  "community",
  "ai_generated",
  "ai_assisted",
  "editor_reviewed",
]);

export const publicationStateEnum = pgEnum("publication_state", [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "rejected",
  "archived",
  "taken_down",
]);

export const moderationStateEnum = pgEnum("moderation_state", [
  "pending",
  "auto_approved",
  "held",
  "auto_rejected",
  "approved",
  "rejected",
]);

export const generationStateEnum = pgEnum("generation_state", [
  "idle",
  "queued",
  "generating",
  "prepared",
  "failed",
]);

export const safetyClassEnum = pgEnum("safety_class", [
  "general",
  "health",
  "finance",
  "law",
  "politics",
  "security",
  "safety",
]);

export const knowledgeLevelEnum = pgEnum("knowledge_level", [
  "new",
  "familiar",
  "experienced",
  "expert",
]);

export const depthEnum = pgEnum("depth", ["skim", "standard", "deep"]);

export const toneEnum = pgEnum("tone", [
  "neutral",
  "warm",
  "direct",
  "playful",
  "rigorous",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "url",
  "book",
  "paper",
  "video",
  "audio",
  "document",
  "code",
  "dataset",
  "government",
  "other",
]);

export const uploadKindEnum = pgEnum("upload_kind", [
  "text",
  "markdown",
  "url",
  "document",
  "pdf",
  "source_code",
  "archive",
  "audio",
  "video",
  "image",
]);

export const scanStatusEnum = pgEnum("scan_status", [
  "pending",
  "clean",
  "infected",
  "suspicious",
  "error",
  "skipped_dev_stub",
]);

export const sceneKindEnum = pgEnum("scene_kind", ["schema", "jsx", "html"]);

export const followTargetEnum = pgEnum("follow_target", ["user", "creator", "topic"]);

export const reactionKindEnum = pgEnum("reaction_kind", [
  "useful",
  "insightful",
  "unclear",
  "inspiring",
]);

export const feedInteractionKindEnum = pgEnum("feed_interaction_kind", [
  "impression",
  "view",
  "complete",
  "skip",
  "save",
  "unsave",
  "react",
  "share",
  "hide",
  "report",
  "explain_deeper",
  "simplify",
  "show_example",
  "follow_up",
  "open_source",
  "quiz_answer",
  "restart",
]);

export const moderationOutcomeEnum = pgEnum("moderation_outcome", [
  "auto_approve",
  "hold",
  "auto_reject",
  "human_approve",
  "human_reject",
]);

export const reportStatusEnum = pgEnum("report_status", [
  "open",
  "triaging",
  "resolved",
  "dismissed",
]);

export const appealStatusEnum = pgEnum("appeal_status", [
  "open",
  "reviewing",
  "upheld",
  "denied",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "active",
  "completed",
  "failed",
  "delayed",
  "cancelled",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "push",
]);

export const artifactCompileStateEnum = pgEnum("artifact_compile_state", [
  "pending",
  "compiling",
  "compiled",
  "rejected",
  "failed",
]);
