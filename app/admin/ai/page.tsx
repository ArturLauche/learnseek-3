import { checkProviderHealth } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { generationJobs, providerRequests, promptTemplates } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { getEnv } from "@/lib/env";

export default async function AdminAiPage() {
  const health = await checkProviderHealth();
  const templates = await db.select().from(promptTemplates);
  const requests = await db.select().from(providerRequests).orderBy(desc(providerRequests.createdAt)).limit(20);
  const failed = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.status, "failed"))
    .orderBy(desc(generationJobs.updatedAt))
    .limit(20);
  const env = getEnv();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">AI operations</h1>
      <Alert variant={health.configured ? "success" : "warning"}>
        <AlertTitle>{health.providerName}</AlertTitle>
        <AlertDescription>
          Configured: {health.configured ? "yes" : "no (serving seed/editorial fallback)"}. Reachable:{" "}
          {health.reachable ? "yes" : "no"}. Latency: {health.latencyMs ?? "—"}ms. Circuit:{" "}
          {health.circuitOpen ? "open" : "closed"}. Displayed models: {env.AI_MODEL} / {env.AI_FAST_MODEL}. Secrets are
          never displayed.
        </AlertDescription>
      </Alert>
      <section>
        <h2 className="mb-3 text-sm tracking-[0.2em] uppercase">Prompt templates</h2>
        <Table hoverableRows>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Schema</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.slug}</TableCell>
                <TableCell>{row.purpose}</TableCell>
                <TableCell>{row.schemaVersion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <section>
        <h2 className="mb-3 text-sm tracking-[0.2em] uppercase">Recent provider requests</h2>
        <Table hoverableRows>
          <TableHeader>
            <TableRow>
              <TableHead>Model</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No provider calls yet.</TableCell>
              </TableRow>
            ) : (
              requests.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>{row.purpose}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "ok" ? "success" : "error"}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{row.latencyMs ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
      <section>
        <h2 className="mb-3 text-sm tracking-[0.2em] uppercase">Failed jobs</h2>
        <Table hoverableRows>
          <TableHeader>
            <TableRow>
              <TableHead>Kind</TableHead>
              <TableHead>Queue</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Retry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {failed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>No failed jobs.</TableCell>
              </TableRow>
            ) : (
              failed.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.kind}</TableCell>
                  <TableCell>{row.queueName}</TableCell>
                  <TableCell>{row.errorSafe ?? "—"}</TableCell>
                  <TableCell>
                    <ConfirmForm endpoint="/api/admin/jobs/retry" payload={{ jobId: row.id }} label="Retry" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
