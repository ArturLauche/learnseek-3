import { AppShell } from "@/components/shell/app-shell";
import { getCurrentSession } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { notifications, preferences } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { directionForLanguages } from "@/lib/i18n/dir";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  let unread = 0;
  let dir: "ltr" | "rtl" = "ltr";
  let lang = "en";
  if (session?.user) {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, session.user.id), isNull(notifications.readAt)))
      .limit(20);
    unread = rows.length;
    const [pref] = await db.select().from(preferences).where(eq(preferences.userId, session.user.id)).limit(1);
    dir = directionForLanguages(pref?.languages);
    lang = pref?.languages[0] ?? "en";
  }
  return (
    <div dir={dir} lang={lang}>
      <AppShell signedIn={Boolean(session)} unread={unread}>
        {children}
      </AppShell>
    </div>
  );
}
