import { db } from "@/lib/db";
import { contentItems, reports, user, generationJobs, moderationCases } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import { Card, CardDescription, CardHeader, CardTitle } from "@appica/ui-react/card";

export default async function AdminHomePage() {
  const [users] = await db.select({ n: count() }).from(user);
  const [items] = await db.select({ n: count() }).from(contentItems);
  const [openReports] = await db.select({ n: count() }).from(reports);
  const [jobs] = await db.select({ n: count() }).from(generationJobs);
  const [cases] = await db.select({ n: count() }).from(moderationCases);

  const cards = [
    { label: "Users", value: users?.n ?? 0 },
    { label: "Content items", value: items?.n ?? 0 },
    { label: "Reports", value: openReports?.n ?? 0 },
    { label: "Generation jobs", value: jobs?.n ?? 0 },
    { label: "Moderation cases", value: cases?.n ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight">Overview</h1>
      <p className="mt-1 text-sm text-foreground-muted">Live counts from PostgreSQL — not placeholders.</p>
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
    </div>
  );
}
