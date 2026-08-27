/** Strip secrets and obvious PII before prompts or logs. Never send private user material raw. */
export function stripSensitive(text: string): string {
  return text
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[card]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[aws-key]")
    .replace(/\b(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/\bsk-[A-Za-z0-9]{20,}\b/g, "[provider-key]")
    .replace(/\b(ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g, "[github-token]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]");
}

export function looksLikeSecret(text: string): boolean {
  return /AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|(api[_-]?key|secret)\s*[:=]\s*\S+/i.test(text);
}
