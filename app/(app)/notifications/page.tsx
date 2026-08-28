import { getCurrentSession } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";
import { MarkReadButton } from "@/components/notifications/mark-read";

export default async function NotificationsPage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="info">
          <AlertTitle>Notifications need an account</AlertTitle>
          <AlertDescription>Follows, path reminders, and moderation updates stay on your profile.</AlertDescription>
        </Alert>
        <Link href="/sign-in" className={`${buttonVariants({ variant: "primary" })} mt-6 inline-flex`}>
          Sign in
        </Link>
      </div>
    );
  }
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-4xl">Notifications</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        No streak guilt. Reminders exist to help you return, not to pressure you.
      </p>
      <MarkReadButton ids={rows.filter((row) => !row.readAt).map((row) => row.id)} />
      <ul className="mt-8 space-y-4">
        {rows.length === 0 ? <li className="text-foreground-muted">You are caught up.</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="border-b border-border-muted pb-3">
            <p className="font-medium">{row.title}</p>
            <p className="text-sm text-foreground-muted">{row.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
