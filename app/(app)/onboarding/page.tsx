import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";

export default async function OnboardingPage() {
  const topicRows = await db.select().from(topics).where(isNull(topics.deletedAt)).orderBy(topics.sortOrder);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-4xl">What do you want to learn?</h1>
      <p className="mt-2 text-foreground-muted">
        A few minutes of preference-setting. Then the feed starts immediately from prepared items — never blocked on
        a model call.
      </p>
      <OnboardingForm
        topics={topicRows.map((topic) => ({ id: topic.id, slug: topic.slug, name: topic.name, description: topic.description }))}
      />
    </div>
  );
}
