import { db } from "@/lib/db";
import { contentItems } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";

export default async function AdminContentPage() {
  const rows = await db.select().from(contentItems).orderBy(desc(contentItems.updatedAt)).limit(100);
  return (
    <div>
      <h1 className="text-2xl font-medium">Content</h1>
      <Table className="mt-6" hoverableRows>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Format</TableHead>
            <TableHead>Publication</TableHead>
            <TableHead>Moderation</TableHead>
            <TableHead>Origin</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.title}</TableCell>
              <TableCell>{row.format}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.publicationState}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="soft">{row.moderationState}</Badge>
              </TableCell>
              <TableCell>{row.origin}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
