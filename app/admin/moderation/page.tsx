import { db } from "@/lib/db";
import { moderationCases } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";

export default async function AdminModerationPage() {
  const rows = await db.select().from(moderationCases).orderBy(desc(moderationCases.createdAt)).limit(100);
  return (
    <div>
      <h1 className="text-2xl font-medium">Moderation</h1>
      <Table className="mt-6" hoverableRows>
        <TableHeader>
          <TableRow>
            <TableHead>Case</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Recommended</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>No open cases. New public submissions create cases automatically.</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.status}</Badge>
                </TableCell>
                <TableCell>{row.priority.toFixed(2)}</TableCell>
                <TableCell>{row.recommendedAction ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
