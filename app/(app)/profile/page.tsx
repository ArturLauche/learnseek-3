import { getCurrentSession } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { profiles, progressSummaries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="info">
          <AlertTitle>Public profiles belong to accounts</AlertTitle>
          <AlertDescription>You can still read the feed anonymously.</AlertDescription>
        </Alert>
        <Link href="/sign-in" className={`${buttonVariants({ variant: "primary" })} mt-6 inline-flex`}>
          Sign in
        </Link>
      </div>
    );
  }
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);
  const [progress] = await db
    .select()
    .from(progressSummaries)
    .where(eq(progressSummaries.userId, session.user.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-4xl">{profile?.displayName ?? session.user.name}</h1>
      <p className="mt-2 text-foreground-muted">{profile?.bio ?? "Add a short bio from settings after onboarding."}</p>
      <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-foreground-subtle">Minutes learned</dt>
          <dd className="text-2xl font-serif">{progress?.minutesLearned ?? 0}</dd>
        </div>
        <div>
          <dt className="text-foreground-subtle">Items completed</dt>
          <dd className="text-2xl font-serif">{progress?.itemsCompleted ?? 0}</dd>
        </div>
      </dl>
      <div className="mt-8 flex gap-3">
        <Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>
          Edit preferences
        </Link>
        <Link href="/settings" className={buttonVariants({ variant: "ghost" })}>
          Settings
        </Link>
      </div>
    </div>
  );
}
