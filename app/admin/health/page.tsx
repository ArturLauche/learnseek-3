import { probeHealth } from "@/lib/health/probes";
import { Badge } from "@appica/ui-react/badge";

export default async function AdminHealthPage() {
  const report = await probeHealth();
  return (
    <div>
      <h1 className="text-2xl font-medium">Health</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Same probes as <code>/api/health</code>. Unset optional services stay honest: they are not errors.
        Semantic search reports <code>fts_only</code>, <code>fts_vectors_idle</code>, or <code>hybrid</code> instead of
        failing silently.
      </p>
      <p className="mt-2 text-sm">
        Overall:{" "}
        <Badge variant={report.ok ? "success" : "error"}>{report.ok ? "ok" : "degraded"}</Badge>
      </p>
      <ul className="mt-6 space-y-2">
        {Object.entries(report.checks).map(([label, check]) => (
          <li key={label} className="flex items-center gap-3">
            <span className="w-36 text-sm">{label}</span>
            <Badge variant={check.ok ? "outline" : "error"}>{check.ok ? "ok" : "fail"}</Badge>
            {check.detail ? <span className="text-xs text-foreground-muted">{check.detail}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
