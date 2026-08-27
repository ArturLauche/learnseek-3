import { getCurrentSession } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AccountSettings } from "@/components/settings/account-settings";
import { db } from "@/lib/db";
import { userByokCredentials } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
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
      />
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
