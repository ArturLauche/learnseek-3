import { db } from "@/lib/db";
import { contentItems, feedQueueItems } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { ConfirmForm } from "@/components/admin/confirm-form";
import Link from "next/link";

export default async function AdminContentPage() {
  const rows = await db.select().from(contentItems).orderBy(desc(contentItems.updatedAt)).limit(100);
  const ranked = await db
    .select({
      contentItemId: feedQueueItems.contentItemId,
      rankingFactors: feedQueueItems.rankingFactors,
      policyDecisions: feedQueueItems.policyDecisions,
    })
    .from(feedQueueItems)
    .orderBy(desc(feedQueueItems.createdAt))
    .limit(200);
  const latestFactors = new Map<string, { rankingFactors: Record<string, number | string>; policyDecisions: string[] }>();
  for (const row of ranked) {
    if (!latestFactors.has(row.contentItemId)) {
      latestFactors.set(row.contentItemId, {
        rankingFactors: row.rankingFactors,
        policyDecisions: row.policyDecisions,
      });
    }
  }
  return (
    <div>
      <h1 className="text-2xl font-medium">Content</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Ranking-factor explanations are the public scoring reasons stored on the feed queue. They never include prompts
        or private model traces.
      </p>
      <Table className="mt-6" hoverableRows>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Publication</TableHead>
            <TableHead>Moderation</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Ranking factors</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const factors = latestFactors.get(row.id);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/learn/${row.slug}`} className="underline">
                    {row.title}
                  </Link>
                </TableCell>
                <TableCell>{row.format}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.publicationState}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="soft">{row.moderationState}</Badge>
                </TableCell>
                <TableCell>{row.origin}</TableCell>
                <TableCell className="max-w-xs text-xs text-foreground-muted">
                  {factors?.rankingFactors.explanation
                    ? String(factors.rankingFactors.explanation)
                    : factors
                      ? `topic ${factors.rankingFactors.topic} · quality ${factors.rankingFactors.quality}`
                      : "Not currently queued"}
                </TableCell>
                <TableCell className="space-y-2">
                  <ConfirmForm
                    endpoint="/api/admin/content"
                    payload={{ contentItemId: row.id, action: "publish" }}
                    label="Publish"
                  />
                  <ConfirmForm
                    endpoint="/api/admin/content"
                    payload={{ contentItemId: row.id, action: "feature" }}
                    label="Feature"
                  />
                  <ConfirmForm
                    endpoint="/api/admin/content"
                    payload={{ contentItemId: row.id, action: "takedown" }}
                    label="Takedown"
                    destructive
                    stepUp
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
