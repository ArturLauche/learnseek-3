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

  return (
    <Form
      className="mt-8 space-y-5"
      onFormSubmit={async (values) => {
        const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][name="file"]');
        const file = fileInput?.files?.[0];
        if (file) {
          const form = new FormData();
          form.set("file", file);
          form.set("kind", String(values.kind ?? "document"));
          form.set("rightsConfirmed", "true");
          if (values.sourceUrl) form.set("sourceUrl", String(values.sourceUrl));
          await fetch("/api/uploads", { method: "POST", body: form });
        }
        const res = await fetch("/api/create/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        setMessage(json.ok ? "Draft stored. It will not publish until review and moderation pass." : json.error ?? "Could not save");
      }}
    >
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
      <Button type="submit">Save draft</Button>
      {message ? (
        <Alert variant="success">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </Form>
  );
}
