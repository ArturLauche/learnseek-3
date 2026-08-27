"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { Alert, AlertDescription } from "@appica/ui-react/alert";

export function AccountSettings({
  email,
  byok,
}: {
  email: string;
  byok: { providerName: string; keyLastFour: string; baseUrl: string }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="font-serif text-2xl">Notifications</h2>
        <p className="mt-1 text-sm text-foreground-muted">Reminders exist to help you return, not to pressure you.</p>
        <form
          className="mt-4 space-y-2 text-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await fetch("/api/settings/notifications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emailEnabled: form.get("emailEnabled") === "on",
                pathReminders: form.get("pathReminders") === "on",
                dailySuggestions: form.get("dailySuggestions") === "on",
                quietHoursStart: form.get("quietHoursStart"),
                quietHoursEnd: form.get("quietHoursEnd"),
              }),
            });
            setMessage("Notification preferences saved.");
          }}
        >
          <label className="flex items-center gap-2">
            <Checkbox name="emailEnabled" /> Optional email
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="pathReminders" defaultChecked /> Path reminders
          </label>
          <label className="flex items-center gap-2">
            <Checkbox name="dailySuggestions" defaultChecked /> Daily suggestions
          </label>
          <Field name="quietHoursStart">
            <FieldLabel>Quiet hours start</FieldLabel>
            <Input name="quietHoursStart" placeholder="22:00" />
          </Field>
          <Field name="quietHoursEnd">
            <FieldLabel>Quiet hours end</FieldLabel>
            <Input name="quietHoursEnd" placeholder="07:00" />
          </Field>
          <Button type="submit" size="sm">
            Save channels
          </Button>
        </form>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Bring your own key</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Encrypted at rest. After save we only show the last four characters. Keys are never shared across users.
        </p>
        <ul className="mt-3 text-sm">
          {byok.map((row) => (
            <li key={row.providerName}>
              {row.providerName} · {row.baseUrl} · ••••{row.keyLastFour}
            </li>
          ))}
        </ul>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const res = await fetch("/api/byok", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                providerName: form.get("providerName"),
                baseUrl: form.get("baseUrl"),
                apiKey: form.get("apiKey"),
                model: form.get("model"),
              }),
            });
            const json = (await res.json()) as { lastFour?: string; error?: string };
            setMessage(json.lastFour ? `Stored. Last four: ${json.lastFour}` : json.error ?? "Could not store");
            event.currentTarget.reset();
          }}
        >
          <Field name="providerName">
            <FieldLabel>Provider name</FieldLabel>
            <Input name="providerName" required defaultValue="openai-compatible" />
          </Field>
          <Field name="baseUrl">
            <FieldLabel>Base URL</FieldLabel>
            <Input name="baseUrl" required placeholder="https://api.example.com/v1" />
          </Field>
          <Field name="apiKey">
            <FieldLabel>API key</FieldLabel>
            <Input name="apiKey" type="password" required autoComplete="off" />
            <FieldDescription>Never displayed in full after storage.</FieldDescription>
          </Field>
          <Field name="model">
            <FieldLabel>Preferred model</FieldLabel>
            <Input name="model" />
          </Field>
          <Button type="submit" size="sm">
            Encrypt and store
          </Button>
        </form>
      </section>
      <section>
        <h2 className="font-serif text-2xl">Your data</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "export" }) }).then(() => setMessage("Export stored in your private bucket.")) }
          >
            Export my data
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "delete" }) }).then(() => setMessage("Deletion queued.")) }
          >
            Request deletion
          </Button>
        </div>
        <p className="mt-2 text-xs text-foreground-muted">Email on file: {email}</p>
      </section>
      {message ? (
        <Alert variant="info">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
