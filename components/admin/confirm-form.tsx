"use client";

import { useState } from "react";
import { Button } from "@appica/ui-react/button";
import { Checkbox } from "@appica/ui-react/checkbox";

export function ConfirmForm({
  endpoint,
  payload,
  label,
  destructive = false,
}: {
  endpoint: string;
  payload: Record<string, unknown>;
  label: string;
  destructive?: boolean;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirmed) {
          setMessage("Confirm first.");
          return;
        }
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirmed: true }),
        });
        setMessage(res.ok ? "Recorded." : "Action failed.");
      }}
    >
      <label className="flex items-center gap-2 text-xs">
        <Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(Boolean(value))} />
        Confirm
      </label>
      <Button type="submit" size="sm" variant={destructive ? "destructive" : "outline"}>
        {label}
      </Button>
      {message ? <span className="text-xs text-foreground-muted">{message}</span> : null}
    </form>
  );
}
