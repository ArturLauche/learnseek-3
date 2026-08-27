import { db } from "@/lib/db";
import { auditEvents } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";

export default async function AdminAuditPage() {
  const rows = await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
  return (
    <div>
      <h1 className="text-2xl font-medium">Audit</h1>
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>No audit events yet. Destructive admin actions write here.</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.createdAt.toISOString()}</TableCell>
                <TableCell>{row.actorType}</TableCell>
                <TableCell>{row.action}</TableCell>
                <TableCell>
                  {row.targetType} {row.targetId}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
