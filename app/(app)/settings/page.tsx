import { getCurrentSession } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/sign-in");
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-serif text-4xl">Settings</h1>
      <p className="mt-2 text-foreground-muted">
        Notification channels, quiet hours, and BYOK live here. Encrypted keys are never shown in full after storage.
      </p>
      <dl className="mt-8 space-y-2 text-sm">
        <div>
          <dt className="text-foreground-subtle">Email</dt>
          <dd>{session.user.email}</dd>
        </div>
      </dl>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
