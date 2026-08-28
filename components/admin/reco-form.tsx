"use client";

import { useState } from "react";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Input } from "@appica/ui-react/input";
import { Field, FieldLabel } from "@appica/ui-react/field";

export function RecoForm({
  slug,
  explorationPercent,
  qualityThreshold,
}: {
  slug: string;
  explorationPercent: number;
  qualityThreshold: number;
}) {
  const [exploration, setExploration] = useState(explorationPercent);
  const [quality, setQuality] = useState(qualityThreshold);
  return (
    <div className="space-y-3 px-6 pb-6">
      <Field>
        <FieldLabel>Exploration percent</FieldLabel>
        <Input
          type="number"
          min={0}
          max={50}
          value={exploration}
          onChange={(event) => setExploration(Number(event.target.value))}
        />
      </Field>
      <Field>
        <FieldLabel>Quality threshold</FieldLabel>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={quality}
          onChange={(event) => setQuality(Number(event.target.value))}
        />
      </Field>
      <ConfirmForm
        endpoint="/api/admin/reco"
        payload={{ slug, explorationPercent: exploration, qualityThreshold: quality }}
        label="Save controls"
      />
    </div>
  );
}
