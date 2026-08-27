import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Generated experiences are served only from SANDBOX_ORIGIN (dedicated host).
 * This app-origin route refuses to render them so the iframe cannot be same-origin.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ artifactId: string }> }) {
  await context.params;
  const origin = getEnv().SANDBOX_ORIGIN;
  return new NextResponse(
    `Sandboxed experiences are served from ${origin}, not from the application origin.`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    },
  );
}
