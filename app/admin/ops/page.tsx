import { ConfirmForm } from "@/components/admin/confirm-form";
import { db } from "@/lib/db";
import { importExportJobs, policyConfigs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export default async function AdminOpsPage() {
  const jobs = await db.select().from(importExportJobs).orderBy(desc(importExportJobs.createdAt)).limit(20);
  const policies = await db.select().from(policyConfigs);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Operations</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Import/export of policy JSON, takedowns from content, and health live here. Destructive actions need
          password confirmation.
        </p>
      </div>
      <section>
        <h2 className="text-lg font-medium">Policy versions</h2>
        <ul className="mt-2 text-sm">
          {policies.map((row) => (
            <li key={row.id}>
              {row.slug} · v{row.version}
              {typeof row.body.retentionDays === "number" ? ` · retention ${row.body.retentionDays} days` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-foreground-muted">
          Retention is operator policy JSON on <code>policy_configs.body.retentionDays</code>. Legal pages stay
          placeholders until the operator publishes their own notices.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg font-medium">Import / export</h2>
        <ConfirmForm endpoint="/api/admin/import-export" payload={{ kind: "export_policy" }} label="Export policy JSON" />
        <ConfirmForm
          endpoint="/api/admin/import-export"
          payload={{ kind: "export_audit" }}
          label="Export recent audit"
        />
      </section>
      <section>
        <h2 className="text-lg font-medium">Recent jobs</h2>
        <ul className="mt-2 text-sm">
          {jobs.map((row) => (
            <li key={row.id}>
              {row.kind} · {row.status} · {row.objectKey ?? "—"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
