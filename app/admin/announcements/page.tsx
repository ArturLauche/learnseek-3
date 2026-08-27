import { db } from "@/lib/db";
import { announcements } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ConfirmForm } from "@/components/admin/confirm-form";

export default async function AdminAnnouncementsPage() {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(50);
  return (
    <div>
      <h1 className="text-2xl font-medium">Announcements</h1>
      <p className="mt-1 text-sm text-foreground-muted">Shown on explore when dates overlap now. Confirm writes an audit row.</p>
      <div className="mt-6">
        <ConfirmForm
          endpoint="/api/admin/announcements"
          payload={{
            title: "Welcome to this Oriel instance",
            body: "This operator-run copy of Oriel is free. Check community standards before publishing.",
          }}
          label="Publish welcome announcement"
        />
      </div>
      <ul className="mt-6 space-y-3 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-border p-3">
            <p className="font-medium">{row.title}</p>
            <p className="text-foreground-muted">{row.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
