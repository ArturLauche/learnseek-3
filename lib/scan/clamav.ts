import net from "node:net";
import { getEnv } from "@/lib/env";

export async function clamavScan(bytes: Buffer): Promise<{ status: "clean" | "infected" | "error"; detail: string }> {
  const env = getEnv();
  if (!env.CLAMAV_HOST) return { status: "error", detail: "no_host" };
  return new Promise((resolve) => {
    const socket = net.connect({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ status: "error", detail: "timeout" });
    }, 15_000);
    let out = "";
    socket.on("data", (chunk) => {
      out += chunk.toString();
    });
    socket.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: "error", detail: error.message });
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const size = Buffer.alloc(4);
      size.writeUInt32BE(bytes.length, 0);
      socket.write(size);
      socket.write(bytes);
      const end = Buffer.alloc(4);
      socket.write(end);
    });
    socket.on("end", () => {
      clearTimeout(timer);
      if (/FOUND/.test(out)) resolve({ status: "infected", detail: out.trim() });
      else if (/OK/.test(out)) resolve({ status: "clean", detail: "ok" });
      else resolve({ status: "error", detail: out.trim() || "unknown" });
    });
  });
}
