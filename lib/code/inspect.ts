import { looksLikeSecret } from "@/lib/pii";

const EXECUTABLE_EXTENSIONS = new Set([
  "exe",
  "dll",
  "so",
  "dylib",
  "bin",
  "com",
  "bat",
  "cmd",
  "ps1",
  "msi",
  "wasm",
]);

const ALLOWED_CODE_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "c",
  "h",
  "cc",
  "cpp",
  "cs",
  "swift",
  "sql",
  "md",
  "txt",
  "json",
  "yml",
  "yaml",
  "toml",
  "lock",
  "css",
  "html",
  "sh",
  "dockerfile",
  "gitignore",
  "license",
]);

const MALWARE_HINTS = [
  /powershell\s+-enc/i,
  /cmd\.exe\s+\/c/i,
  /fromCharCode\(\s*0x/i,
  /runtime\.exec\(/i,
  /child_process/i,
  /os\.system\(/i,
];

export type CodeInspection = {
  path: string;
  language: string | null;
  secrets: string[];
  malwareHints: string[];
  licenseHint: string | null;
  allowedType: boolean;
  executable: boolean;
};

export function extensionOf(path: string): string {
  const base = path.split("/").pop() ?? path;
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const parts = base.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

export function inspectCodeFile(path: string, content: string): CodeInspection {
  const ext = extensionOf(path);
  const secrets: string[] = [];
  if (looksLikeSecret(content)) secrets.push("credential_pattern");
  if (/BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY/.test(content)) secrets.push("private_key");
  if (/-----BEGIN CERTIFICATE-----/.test(content) && /PRIVATE KEY/.test(content)) {
    secrets.push("embedded_key_material");
  }
  const malwareHints = MALWARE_HINTS.filter((pattern) => pattern.test(content)).map((p) => p.source);
  const licenseHint = detectLicense(content);
  return {
    path,
    language: ext || null,
    secrets,
    malwareHints,
    licenseHint,
    allowedType: ALLOWED_CODE_EXTENSIONS.has(ext) || ext === "",
    executable: EXECUTABLE_EXTENSIONS.has(ext),
  };
}

export function detectLicense(content: string): string | null {
  const head = content.slice(0, 2000).toLowerCase();
  if (head.includes("mit license")) return "MIT";
  if (head.includes("apache license")) return "Apache-2.0";
  if (head.includes("gnu general public license")) return "GPL";
  if (head.includes("bsd license") || head.includes("redistribution and use")) return "BSD";
  if (head.includes("mozilla public license")) return "MPL-2.0";
  return null;
}

export function archiveLooksZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/** Reject obvious zip bombs by local-file uncompressed size without extracting. */
export function zipUncompressedTooLarge(bytes: Uint8Array, maxBytes = 40_000_000): boolean {
  if (!archiveLooksZip(bytes)) return false;
  let total = 0;
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    if (bytes[offset] !== 0x50 || bytes[offset + 1] !== 0x4b) break;
    if (bytes[offset + 2] !== 0x03 || bytes[offset + 3] !== 0x04) break;
    const nameLen = bytes[offset + 26]! + (bytes[offset + 27]! << 8);
    const extraLen = bytes[offset + 28]! + (bytes[offset + 29]! << 8);
    const compSize =
      bytes[offset + 18]! +
      (bytes[offset + 19]! << 8) +
      (bytes[offset + 20]! << 16) +
      (bytes[offset + 21]! << 24);
    const uncompSize =
      bytes[offset + 22]! +
      (bytes[offset + 23]! << 8) +
      (bytes[offset + 24]! << 16) +
      (bytes[offset + 25]! << 24);
    total += uncompSize;
    if (total > maxBytes) return true;
    offset += 30 + nameLen + extraLen + compSize;
  }
  return false;
}
