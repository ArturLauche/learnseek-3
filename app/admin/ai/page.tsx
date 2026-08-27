import { checkProviderHealth } from "@/lib/ai/provider";
import { db } from "@/lib/db";
import { providerRequests, promptTemplates } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";

export default async function AdminAiPage() {
  const health = await checkProviderHealth();
  const templates = await db.select().from(promptTemplates);
  const requests = await db.select().from(providerRequests).orderBy(desc(providerRequests.createdAt)).limit(20);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">AI operations</h1>
      <Alert variant={health.configured ? "success" : "warning"}>
        <AlertTitle>{health.providerName}</AlertTitle>
        <AlertDescription>
          Configured: {health.configured ? "yes" : "no (serving seed/editorial fallback)"}. Reachable:{" "}
          {health.reachable ? "yes" : "no"}. Latency: {health.latencyMs ?? "—"}ms. Circuit:{" "}
          {health.circuitOpen ? "open" : "closed"}. Secrets are never displayed.
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
    </div>
  );
}
