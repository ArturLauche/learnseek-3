"use client";

import { useState } from "react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";
import { Input } from "@appica/ui-react/input";

export function ConfirmForm({
  endpoint,
  payload,
  label,
  destructive = false,
  stepUp = false,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  destructive?: boolean;
  stepUp?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const needsStepUp = stepUp || destructive;
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirmed) {
          setMessage("Confirm first.");
          return;
        }
        if (needsStepUp && password.length < 12) {
          setMessage("Re-enter your password (12+ characters) for this action.");
          return;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            confirmed: true,
            stepUpPassword: needsStepUp ? password : undefined,
          }),
        });
        setMessage(res.ok ? "Recorded." : "Action failed.");
      }}
    >
      <label className="flex items-center gap-2 text-xs">
        <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(Boolean(value))} />
        Confirm
      </label>
      {needsStepUp ? (
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Re-enter password"
          aria-label="Re-enter password for this sensitive action"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-8 w-40 text-xs"
        />
      ) : null}
      <Button type="submit" size="sm" variant={destructive ? "destructive" : "outline"}>
        {label}
      </Button>
      {message ? <span className="text-xs text-foreground-muted">{message}</span> : null}
    </form>
  );
}
