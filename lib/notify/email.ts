import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export function emailConfigured() {
  const env = getEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

export async function sendEmail(params: { to: string; subject: string; text: string }) {
  const env = getEnv();
  if (!emailConfigured()) {
    return { skipped: true as const, reason: "smtp_unconfigured" };
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  });
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    return { skipped: false as const };
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.name : "smtp" }, "email send failed");
    return { skipped: true as const, reason: "smtp_error" };
  }
}
