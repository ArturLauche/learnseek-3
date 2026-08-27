"use client";

import { useState } from "react";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Input } from "@appica/ui-react/input";
import { Field, FieldLabel } from "@appica/ui-react/field";
import type { RetentionPolicy } from "@/lib/privacy/retention-policy";

export function PolicyForm({ slug, policy }: { slug: string; policy: RetentionPolicy }) {
  const [sessionsDays, setSessionsDays] = useState(policy.sessionsDays);
  const [analyticsDays, setAnalyticsDays] = useState(policy.analyticsDays);
  const [deletedAccountDays, setDeletedAccountDays] = useState(policy.deletedAccountDays);
  const [generationArtifactsDays, setGenerationArtifactsDays] = useState(policy.generationArtifactsDays);
  const [searchesDays, setSearchesDays] = useState(policy.searchesDays);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>Expired session grace (days)</FieldLabel>
          <Input
            type="number"
            min={0}
            value={sessionsDays}
            onChange={(event) => setSessionsDays(Number(event.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel>Analytics events (days)</FieldLabel>
          <Input
            type="number"
            min={1}
            value={analyticsDays}
            onChange={(event) => setAnalyticsDays(Number(event.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel>Deleted-account remnants (days)</FieldLabel>
          <Input
            type="number"
            min={0}
            value={deletedAccountDays}
            onChange={(event) => setDeletedAccountDays(Number(event.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel>Unpublished generation artifacts (days)</FieldLabel>
          <Input
            type="number"
            min={1}
            value={generationArtifactsDays}
            onChange={(event) => setGenerationArtifactsDays(Number(event.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel>Search logs (days)</FieldLabel>
          <Input
            type="number"
            min={1}
            value={searchesDays}
            onChange={(event) => setSearchesDays(Number(event.target.value))}
          />
        </Field>
      </div>
      <ConfirmForm
        endpoint="/api/admin/policy"
        payload={{
          slug,
          sessionsDays,
          analyticsDays,
          deletedAccountDays,
          generationArtifactsDays,
          searchesDays,
        }}
        label="Save retention policy"
      />
    </div>
  );
}
