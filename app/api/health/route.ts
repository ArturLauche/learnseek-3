import { probeHealth, healthResponse } from "@/lib/health/probes";

export const dynamic = "force-dynamic";

export async function GET() {
  return healthResponse(await probeHealth());
}
