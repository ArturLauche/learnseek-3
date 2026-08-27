export const MODERATION_CATEGORIES = [
  "harassment",
  "hate",
  "sexual",
  "graphic_violence",
  "self_harm",
  "dangerous_instructions",
  "illegal_activity",
  "spam",
  "scams",
  "impersonation",
  "privacy_violations",
  "personal_data",
  "malware",
  "exposed_credentials",
  "manipulated_media",
  "misinformation_risk",
  "plagiarism_risk",
  "copyright_risk",
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

export function decideOutcome(params: {
  maxConfidence: number;
  hasHighRisk: boolean;
  safetyClass: string;
  mode: "strict" | "standard" | "permissive";
}): "auto_approve" | "hold" | "auto_reject" {
  const thresholdReject = params.mode === "strict" ? 0.72 : params.mode === "permissive" ? 0.92 : 0.85;
  const thresholdHold = params.mode === "strict" ? 0.35 : params.mode === "permissive" ? 0.65 : 0.5;
  const sensitive = ["health", "finance", "law", "politics", "security", "safety"].includes(
    params.safetyClass,
  );
  if (params.hasHighRisk && params.maxConfidence >= thresholdReject) return "auto_reject";
  if (sensitive && params.maxConfidence >= thresholdHold * 0.8) return "hold";
  if (params.maxConfidence >= thresholdHold) return "hold";
  return "auto_approve";
}
