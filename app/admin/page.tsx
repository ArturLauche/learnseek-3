import { loadAdminOverview } from "@/lib/admin/metrics";
import { Card, CardDescription, CardHeader, CardTitle } from "@appica/ui-react/card";
import { Badge } from "@appica/ui-react/badge";

export default async function AdminHomePage() {
  const stats = await loadAdminOverview();
  const cards = [
    { label: "Users", value: stats.users },
    { label: "Active users (7d)", value: stats.activeUsers7d },
    { label: "Content items", value: stats.items },
    { label: "Saves", value: stats.saves },
    { label: "Feed impressions", value: stats.impressions },
    { label: "Feed completions", value: stats.completions },
    { label: "Open reports", value: stats.openReports },
    { label: "Moderation cases", value: stats.cases },
    { label: "Open moderation", value: stats.openCases },
    { label: "Generation jobs", value: stats.jobs },
    { label: "Failed jobs", value: stats.failedJobs },
    { label: "Uploads", value: stats.uploads },
    { label: "Provider tokens", value: stats.tokens },
    { label: "Avg provider latency (ms)", value: stats.avgLatencyMs },
  ];

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Live counts from PostgreSQL, Redis queues, and health probes — not placeholders. Ranking quality uses
        completion rate {stats.completionRate.toFixed(2)} (completions / impressions).
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">AI {stats.ai.configured ? "configured" : "fallback"}</Badge>
        <Badge variant="outline">Email {stats.email ? "on" : "unset"}</Badge>
        <Badge variant="outline">Push {stats.push ? "on" : "unset"}</Badge>
        <Badge variant="outline">OTLP {stats.otel ? "on" : "unset"}</Badge>
        <Badge variant="outline">ffmpeg {stats.ffmpeg ? "on" : "metadata-only"}</Badge>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} frame="solid">
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{String(card.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="text-lg font-medium">Queues</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(stats.queueCounts).map(([name, counts]) => (
            <li key={name} className="rounded-md border border-border px-3 py-2">
              <span className="font-medium">{name}</span>
              <span className="ms-2 text-foreground-muted">
                waiting {counts.waiting} · active {counts.active} · failed {counts.failed}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
