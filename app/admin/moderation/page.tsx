import { db } from "@/lib/db";
import { appeals, contentItems, moderationCases, moderationFindings, reports } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { ConfirmForm } from "@/components/admin/confirm-form";

export default async function AdminModerationPage() {
  const rows = await db.select().from(moderationCases).orderBy(desc(moderationCases.createdAt)).limit(100);
  const findings =
    rows.length === 0
      ? []
      : await db.select().from(moderationFindings).where(eq(moderationFindings.caseId, rows[0]!.id));
  const openReports = await db.select().from(reports).orderBy(desc(reports.createdAt)).limit(20);
  const openAppeals = await db.select().from(appeals).orderBy(desc(appeals.createdAt)).limit(20);
  const items = await db.select().from(contentItems).limit(200);
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-medium">Moderation</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Previews, findings, and appeals. Every decision writes an audit row after confirmation.
        </p>
        <Table className="mt-6" hoverableRows>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Recommended</TableHead>
              <TableHead>Decide</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>No cases yet. Reports and public submissions create them.</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const item = row.contentItemId ? byId.get(row.contentItemId) : undefined;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{item?.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.priority.toFixed(2)}</TableCell>
                    <TableCell>{row.recommendedAction ?? "—"}</TableCell>
                    <TableCell className="space-y-2">
                      <ConfirmForm
                        endpoint="/api/admin/moderation"
                        payload={{ caseId: row.id, decision: "approve" }}
                        label="Approve"
                      />
                      <ConfirmForm
                        endpoint="/api/admin/moderation"
                        payload={{ caseId: row.id, decision: "reject" }}
                        label="Reject"
                        destructive
                        stepUp
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div>
        <h2 className="text-lg font-medium">Sample findings</h2>
        <ul className="mt-2 text-sm">
          {findings.map((finding) => (
            <li key={finding.id}>
              {finding.category} · {finding.confidence.toFixed(2)}
            </li>
          ))}
          {findings.length === 0 ? <li className="text-foreground-muted">No findings on the newest case.</li> : null}
        </ul>
      </div>
      <div>
        <h2 className="text-lg font-medium">Reports</h2>
        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openReports.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.details ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div>
        <h2 className="text-lg font-medium">Appeals</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {openAppeals.map((row) => (
            <li key={row.id}>
              {row.status}: {row.statement}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
