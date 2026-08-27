import { loadAdminOverview } from "@/lib/admin/metrics";
import { Badge } from "@appica/ui-react/badge";

export default async function AdminHealthPage() {
  const stats = await loadAdminOverview();
  const rows = [
    ["AI", stats.ai.configured ? "configured" : "unconfigured_fallback"],
    ["Email SMTP", stats.email ? "configured" : "unset"],
    ["Web push", stats.push ? "configured" : "unset"],
    ["OTLP", stats.otel ? "configured" : "unset"],
    ["ffmpeg", stats.ffmpeg ? "available" : "missing"],
  ];
  return (
    <div>
      <h1 className="text-2xl font-medium">Health</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Same probes as <code>/api/health</code>. Unset optional services stay honest: they are not errors.
      </p>
      <ul className="mt-6 space-y-2">
        {rows.map(([label, value]) => (
          <li key={label} className="flex items-center gap-3">
            <span className="w-32 text-sm">{label}</span>
            <Badge variant="outline">{value}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
