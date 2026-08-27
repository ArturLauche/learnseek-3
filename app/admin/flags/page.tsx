import { db } from "@/lib/db";
import { featureFlags } from "@/lib/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { ConfirmForm } from "@/components/admin/confirm-form";

export default async function AdminFlagsPage() {
  const rows = await db.select().from(featureFlags);
  return (
    <div>
      <h1 className="text-2xl font-medium">Feature flags</h1>
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Flag</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Toggle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.slug}</TableCell>
              <TableCell>
                <Badge variant={row.enabled ? "success" : "outline"}>{row.enabled ? "on" : "off"}</Badge>
              </TableCell>
              <TableCell>{row.description}</TableCell>
              <TableCell>
                <ConfirmForm
                  endpoint="/api/admin/flags"
                  payload={{ slug: row.slug, enabled: !row.enabled }}
                  label={row.enabled ? "Turn off" : "Turn on"}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
