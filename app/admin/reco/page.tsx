import { db } from "@/lib/db";
import { recoControls } from "@/lib/db/schema";
import { Card, CardDescription, CardHeader, CardTitle } from "@appica/ui-react/card";

export default async function AdminRecoPage() {
  const rows = await db.select().from(recoControls);
  return (
    <div>
      <h1 className="text-2xl font-medium">Recommendation controls</h1>
      <div className="mt-6 grid gap-4">
        {rows.length === 0 ? (
          <p className="text-sm text-foreground-muted">Seed inserts the default policy. Adjust weights here in later iterations.</p>
        ) : (
          rows.map((row) => (
            <Card key={row.id} frame="solid">
              <CardHeader>
                <CardTitle>{row.slug}</CardTitle>
                <CardDescription>
                  Exploration {String(row.explorationPercent)}% · quality threshold {String(row.qualityThreshold)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
