import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { desc, ilike, or } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { Badge } from "@appica/ui-react/badge";
import { Input } from "@appica/ui-react/input";
import { ConfirmForm } from "@/components/admin/confirm-form";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const rows = q
    ? await db
        .select()
        .from(user)
        .where(or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`), ilike(user.handle, `%${q}%`)))
        .orderBy(desc(user.createdAt))
        .limit(100)
    : await db.select().from(user).orderBy(desc(user.createdAt)).limit(100);
  return (
    <div>
      <h1 className="text-2xl font-medium">Users</h1>
      <form className="mt-4 max-w-sm">
        <Input name="q" defaultValue={q} placeholder="Search email, name, handle" aria-label="Search users" />
      </form>
      <Table className="mt-6" hoverableRows>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Handle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.handle ?? "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.status}</Badge>
              </TableCell>
              <TableCell>{row.createdAt.toISOString().slice(0, 10)}</TableCell>
              <TableCell className="space-y-2">
                <ConfirmForm
                  endpoint="/api/admin/users"
                  payload={{ userId: row.id, action: "warn" }}
                  label="Warn"
                />
                <ConfirmForm
                  endpoint="/api/admin/users"
                  payload={{ userId: row.id, action: "suspend" }}
                  label="Suspend"
                  destructive
                />
                <ConfirmForm
                  endpoint="/api/admin/users"
                  payload={{ userId: row.id, action: "restore" }}
                  label="Restore"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
