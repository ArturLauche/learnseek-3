import { spawn } from "node:child_process";
import { logger } from "@/lib/logger";

export function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-version"]);
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export function runFfmpeg(args: string[], timeoutMs = 60_000): Promise<{ ok: boolean; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, stderr: "timeout" });
    }, timeoutMs);
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 50_000) stderr = stderr.slice(-20_000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      logger.warn({ err: error.message }, "ffmpeg missing");
      resolve({ ok: false, stderr: error.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, stderr });
    });
  });
}
