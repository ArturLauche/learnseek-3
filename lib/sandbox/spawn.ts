import { spawn } from "node:child_process";
import path from "node:path";
import { LIMITS } from "./compiler.mjs";

export const COMPILE_CHILD = path.join(process.cwd(), "worker/compile-child.mjs");

const KEEP_ENV = new Set(["PATH", "LANG", "TZ", "TERM"]);

export type CompileChildResult = {
  ok: boolean;
  html?: string;
  reasons?: string[];
};

export function compileChildEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "production",
    ORIEL_COMPILE_CHILD: "1",
  };
  for (const key of KEEP_ENV) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

export function runCompileChild(
  payload: unknown,
  timeoutMs = Number(LIMITS.timeoutMs),
): Promise<CompileChildResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [`--max-old-space-size=${LIMITS.maxHeapMb}`, COMPILE_CHILD],
      {
        stdio: ["pipe", "pipe", "pipe"],
        env: compileChildEnv(),
        cwd: process.cwd(),
      },
    );
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("compile_timeout"));
    }, timeoutMs);
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();
      if (out.length > Number(LIMITS.maxInputBytes)) {
        child.kill("SIGKILL");
        reject(new Error("compile_output_limit"));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      err += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 && !out) {
        reject(new Error(err || `compile_exit_${code}`));
        return;
      }
      try {
        resolve(JSON.parse(out) as CompileChildResult);
      } catch {
        reject(new Error("compile_parse"));
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
