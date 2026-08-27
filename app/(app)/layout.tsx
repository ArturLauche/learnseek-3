import { AppShell } from "@/components/shell/app-shell";
import { getCurrentSession } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  let unread = 0;
  if (session?.user) {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)))
      .limit(20);
    unread = rows.length;
  }
  return (
    <AppShell signedIn={Boolean(session)} unread={unread}>
      {children}
    </AppShell>
  );
}
