import pino from "pino";

const redact = {
  paths: [
    "password",
    "email",
    "token",
    "authorization",
    "cookie",
    "apiKey",
    "api_key",
    "AI_API_KEY",
    "AUTH_SECRET",
    "ENCRYPTION_KEY",
    "STORAGE_SECRET_KEY",
    "prompt",
    "fullText",
    "keyCiphertext",
    "SMTP_PASSWORD",
    "smtp_password",
    "VAPID_PRIVATE_KEY",
    "vapid_private_key",
  ],
  censor: "[redacted]",
};

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact,
  base: { service: "oriel" },
});
