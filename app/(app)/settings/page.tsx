import { getCurrentSession } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountSettings } from "@/components/settings/account-settings";
import { db } from "@/lib/db";
import { consentRecords, preferences, userByokCredentials } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { deliveryCapabilities } from "@/lib/notify/deliver";
import { getEnv } from "@/lib/env";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/sign-in");
  const byok = await db
    .select({
      providerName: userByokCredentials.providerName,
      keyLastFour: userByokCredentials.keyLastFour,
      baseUrl: userByokCredentials.baseUrl,
    })
    .from(userByokCredentials)
    .where(and(eq(userByokCredentials.userId, session.user.id), isNull(userByokCredentials.revokedAt)));
  const consents = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, session.user.id))
    .orderBy(desc(consentRecords.createdAt))
    .limit(12);
  const [pref] = await db.select().from(preferences).where(eq(preferences.userId, session.user.id)).limit(1);
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-serif text-4xl">Settings</h1>
      <p className="mt-2 text-foreground-muted">
        Notification channels, quiet hours, and BYOK live here. Encrypted keys are never shown in full after storage.
      </p>
      <AccountSettings
        email={session.user.email}
        byok={byok}
        delivery={deliveryCapabilities()}
        vapidPublicKey={getEnv().NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? getEnv().VAPID_PUBLIC_KEY}
        consents={consents.map((row) => ({
          kind: row.kind,
          granted: row.granted,
          version: row.version,
          at: row.createdAt.toISOString(),
        }))}
        languages={pref?.languages ?? ["en"]}
      />
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
