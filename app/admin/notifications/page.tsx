import { db } from "@/lib/db";
import { notificationTemplates } from "@/lib/db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@appica/ui-react/table";
import { ConfirmForm } from "@/components/admin/confirm-form";

export default async function AdminNotificationTemplatesPage() {
  const rows = await db.select().from(notificationTemplates);
  return (
    <div>
      <h1 className="text-2xl font-medium">Notification templates</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Copy is informational. No guilt language. Templates are stored in Postgres and used when a channel is
        configured.
      </p>
      <form
        className="mt-6 grid max-w-xl gap-2 text-sm"
        action="/api/admin/templates"
        method="post"
      />
      <ConfirmForm
        endpoint="/api/admin/templates"
        payload={{
          slug: "daily-suggestion",
          channel: "in_app",
          title: "A prepared item is waiting",
          body: "Open Oriel when you have a minute. Nothing is lost if you wait.",
        }}
        label="Seed daily-suggestion template"
      />
      <Table className="mt-6" hoverableRows>
        <TableHeader>
          <TableRow>
            <TableHead>Slug</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead>Title</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>No templates yet.</TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.slug}</TableCell>
                <TableCell>{row.channel}</TableCell>
                <TableCell>{row.title}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
