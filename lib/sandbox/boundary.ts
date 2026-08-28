export {
  ALLOWLISTED_IMPORTS,
  FORBIDDEN_PATTERNS,
  inspectSource,
} from "./compiler.mjs";

export const SANDBOX_MESSAGE_TYPES = ["completion", "answer", "score", "height", "restart"] as const;
export type SandboxMessageType = (typeof SANDBOX_MESSAGE_TYPES)[number];
