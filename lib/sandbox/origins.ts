/** Origins allowed to embed the sandbox iframe and receive postMessage. */

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function allowedAppOrigins(appUrl: string, extraOrigins: string[] = []): string[] {
  const origins = new Set<string>();
  const primary = originOf(appUrl);
  if (primary) origins.add(primary);
  for (const extra of extraOrigins) {
    const origin = extra.includes("://") ? originOf(extra) : extra;
    if (origin) origins.add(origin);
  }
  if (primary) {
    try {
      const url = new URL(appUrl);
      if (url.hostname === "localhost") {
        origins.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`);
      }
      if (url.hostname === "127.0.0.1") {
        origins.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`);
      }
    } catch {
      /* ignore */
    }
  }
  return [...origins];
}

export function frameAncestorsHeader(appUrl: string, extraOrigins: string[] = []): string {
  return allowedAppOrigins(appUrl, extraOrigins).join(" ");
}

/** Returns the origin if it is an allowed parent; otherwise empty string (reject). */
export function allowedParentOrigin(
  candidate: string | null | undefined,
  appUrl: string,
  extraOrigins: string[] = [],
): string {
  if (!candidate) return "";
  const allowed = new Set(allowedAppOrigins(appUrl, extraOrigins));
  const origin = originOf(candidate);
  if (!origin) return "";
  return allowed.has(origin) ? origin : "";
}

export function originsAreDistinct(appUrl: string, sandboxOrigin: string): boolean {
  const app = originOf(appUrl);
  const sandbox = originOf(sandboxOrigin);
  return Boolean(app && sandbox && app !== sandbox);
}
