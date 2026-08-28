"use client";

import { Form } from "@appica/ui-react/form";
import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Textarea } from "@appica/ui-react/textarea";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { useState } from "react";
import { Alert, AlertDescription } from "@appica/ui-react/alert";

export function CreateForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(values: Record<string, unknown>) {
    setBusy(true);
    setFailed(false);
    setMessage(null);
    try {
      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]');
      const file = fileInput?.files?.[0];
      if (file) {
        const upload = new FormData();
        upload.set("file", file);
        upload.set("kind", String(values.kind ?? "document"));
        upload.set("rightsConfirmed", "true");
        if (values.sourceUrl) upload.set("sourceUrl", String(values.sourceUrl));
        const uploadRes = await fetch("/api/uploads", { method: "POST", body: upload });
        if (!uploadRes.ok) {
          const uploadJson = (await uploadRes.json().catch(() => ({}))) as { error?: string };
          setFailed(true);
          setMessage(uploadJson.error ?? "Upload failed. The draft was not saved. Retry when you are online.");
          return;
        }
      }
      const res = await fetch("/api/create/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          objective: values.objective,
          body: values.body,
          sourceUrl: values.sourceUrl,
          rights: values.rights ?? true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setFailed(true);
        setMessage(json.error ?? "Could not save draft. Retry when you are online.");
        return;
      }
      setMessage(
        file
          ? "Draft stored and upload queued. Nothing publishes until review and moderation pass."
          : "Draft stored. It will not publish until review and moderation pass.",
      );
    } catch {
      setFailed(true);
      setMessage("Network error. Reconnect and retry. Nothing was published.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form className="mt-8 space-y-5" onFormSubmit={(values) => submit(values as Record<string, unknown>)}>
      <Field name="title">
        <FieldLabel>Title</FieldLabel>
        <Input required placeholder="What should someone learn?" />
      </Field>
      <Field name="objective">
        <FieldLabel>Learning objective</FieldLabel>
        <Input required placeholder="After this item, the reader can…" />
      </Field>
      <Field name="body">
        <FieldLabel>Text or Markdown</FieldLabel>
        <Textarea rows={8} placeholder="Original explanation, example, or notes." />
      </Field>
      <Field name="sourceUrl">
        <FieldLabel>Source URL (optional)</FieldLabel>
        <Input type="url" placeholder="https://" />
        <FieldDescription>We store attribution. We do not scrape paywalled commercial summary products.</FieldDescription>
      </Field>
      <Field name="file">
        <FieldLabel>Private upload (optional)</FieldLabel>
        <Input name="file" type="file" />
        <FieldDescription>
          Documents, Markdown, audio, video, or source files. Virus scan is recorded. Uploaded code is never executed in
          the app process.
        </FieldDescription>
      </Field>
      <Field name="kind">
        <FieldLabel>Upload kind</FieldLabel>
        <Input name="kind" defaultValue="markdown" />
      </Field>
      <Field name="rights">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox name="rights" required />
          <span>I confirm I have the right to use this material and understand private uploads are not publicly distributed.</span>
        </label>
      </Field>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save draft"}
      </Button>
      {failed ? (
        <Button type="submit" variant="outline">
          Retry
        </Button>
      ) : null}
      {message ? (
        <Alert variant={failed ? "error" : "success"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </Form>
  );
}
