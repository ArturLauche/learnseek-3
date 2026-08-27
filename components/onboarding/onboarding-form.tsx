"use client";

import { Form } from "@appica/ui-react/form";
import { Field, FieldLabel } from "@appica/ui-react/field";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@appica/ui-react/select";
import { useRouter } from "next/navigation";
import { useState } from "react";

const GOALS = [
  "Stay sharp in a profession",
  "Build a new skill",
  "Understand the world better",
  "Teach others",
  "Practical life skills",
];

export function OnboardingForm({
  topics,
}: {
  topics: { id: string; slug: string; name: string; description: string | null }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <Form
      className="mt-8 space-y-8"
      onFormSubmit={async (values) => {
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, topicIds: selected }),
        });
        router.push("/home");
      }}
    >
      <fieldset>
        <legend className="mb-3 font-serif text-2xl">Topics</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((topic) => {
            const checked = selected.includes(topic.id);
            return (
              <label
                key={topic.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    setSelected((current) =>
                      value ? [...current, topic.id] : current.filter((id) => id !== topic.id),
                    );
                  }}
                />
                <span>
                  <span className="block font-medium">{topic.name}</span>
                  <span className="text-sm text-foreground-muted">{topic.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-serif text-2xl">Why</legend>
        {GOALS.map((goal) => (
          <label key={goal} className="mb-2 flex items-center gap-3 text-sm">
            <Checkbox name="goals" value={goal} />
            {goal}
          </label>
        ))}
      </fieldset>

      <Field name="knowledgeLevel">
        <FieldLabel>Existing knowledge</FieldLabel>
        <Select name="knowledgeLevel" defaultValue="new">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New to most of this</SelectItem>
            <SelectItem value="familiar">Familiar</SelectItem>
            <SelectItem value="experienced">Experienced</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field name="sessionLengthSeconds">
        <FieldLabel>Time per item</FieldLabel>
        <Select name="sessionLengthSeconds" defaultValue="90">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">About 30 seconds</SelectItem>
            <SelectItem value="90">About 90 seconds</SelectItem>
            <SelectItem value="180">Up to 3 minutes</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Button type="submit">Start learning</Button>
    </Form>
  );
}
