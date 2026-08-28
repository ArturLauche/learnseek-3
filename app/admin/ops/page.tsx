import { ConfirmForm } from "@/components/admin/confirm-form";
import { PolicyForm } from "@/components/admin/policy-form";
import { RetentionActions } from "@/components/admin/retention-actions";
import { db } from "@/lib/db";
import { importExportJobs, policyConfigs, retentionRuns } from "@/lib/db/schema";
import { parseRetentionPolicy } from "@/lib/privacy/retention-policy";
import { desc } from "drizzle-orm";

export default async function AdminOpsPage() {
  const jobs = await db.select().from(importExportJobs).orderBy(desc(importExportJobs.createdAt)).limit(20);
  const policies = await db.select().from(policyConfigs);
  const runs = await db.select().from(retentionRuns).orderBy(desc(retentionRuns.startedAt)).limit(8);
  const community = policies.find((row) => row.slug === "community-v1") ?? policies[0];
  const policy = parseRetentionPolicy(community?.body ?? {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium">Operations</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Import/export of policy JSON, retention purge, and health live here. Destructive actions need password
          confirmation. Audit, appeals, and open moderation records are never deleted.
        </p>
      </div>
      <section>
        <h2 className="text-lg font-medium">Retention policy</h2>
        <ul className="mt-2 text-sm">
          {policies.map((row) => (
            <li key={row.id}>
              {row.slug} · v{row.version}
              {typeof row.body.retentionDays === "number" ? ` · analytics fallback ${row.body.retentionDays} days` : ""}
            </li>
          ))}
        </ul>
        {community ? <PolicyForm slug={community.slug} policy={policy} /> : <PolicyForm slug="community-v1" policy={policy} />}
        <p className="mt-2 text-xs text-foreground-muted">
          Legal pages stay placeholders until the operator publishes their own notices. Comments stay disabled.
        </p>
      </section>
      <section>
        <h2 className="text-lg font-medium">Retention purge</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Daily BullMQ job at 03:00 UTC. Dry-run records counts without deleting. Live purge is queued and retried on
          failure.
        </p>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-foreground-muted">No runs yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {runs.map((row) => (
              <li key={row.id}>
                {row.startedAt.toISOString()} · {row.status}
                {row.dryRun ? " · dry-run" : ""} · sessions {Number(row.counts.sessions ?? 0)} · analytics{" "}
                {Number(row.counts.impressions ?? 0) + Number(row.counts.interactions ?? 0)} · artifacts{" "}
                {Number(row.counts.artifacts ?? 0)} · remnants {Number(row.counts.deletedAccountRemnants ?? 0)} ·
                held skipped {Number(row.counts.skippedHeld ?? 0)}
                {row.errorSafe ? ` · ${row.errorSafe}` : ""}
              </li>
            ))}
          </ul>
        )}
        <RetentionActions />
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
