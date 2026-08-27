import { z } from "zod";

export const learningItemSchema = z.object({
  title: z.string().min(4).max(160),
  learningObjective: z.string().min(8).max(400),
  durationSeconds: z.number().int().min(15).max(180),
  format: z.enum([
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
  ]),
  language: z.string().min(2).max(12),
  difficulty: z.enum(["new", "familiar", "experienced", "expert"]),
  depth: z.enum(["skim", "standard", "deep"]),
  tone: z.enum(["neutral", "warm", "direct", "playful", "rigorous"]),
  topicSlug: z.string().min(2),
  tags: z.array(z.string()).max(12),
  safetyClass: z.enum(["general", "health", "finance", "law", "politics", "security", "safety"]),
  bodyText: z.string().min(40),
  scenes: z.array(
    z.object({
      kind: z.enum(["schema", "jsx", "html"]).default("schema"),
      fallbackText: z.string().min(8),
      schema: z.record(z.string(), z.unknown()),
    }),
  ).min(1),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string().url().optional(),
      citation: z.string().optional(),
    }),
  ),
});

export type LearningItemDraft = z.infer<typeof learningItemSchema>;

export const moderationResultSchema = z.object({
  outcome: z.enum(["auto_approve", "hold", "auto_reject"]),
  categories: z.array(
    z.object({
      category: z.string(),
      confidence: z.number().min(0).max(1),
      evidence: z.string().optional(),
    }),
  ),
  priority: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type ModerationResult = z.infer<typeof moderationResultSchema>;
