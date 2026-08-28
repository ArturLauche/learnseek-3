"use client";

import { ConfirmForm } from "@/components/admin/confirm-form";

export function RetentionActions() {
  return (
    <div className="mt-3 space-y-2">
      <ConfirmForm endpoint="/api/admin/retention" payload={{ action: "dry-run" }} label="Dry-run purge" />
      <ConfirmForm
        endpoint="/api/admin/retention"
        payload={{ action: "run" }}
        label="Enqueue live purge"
        destructive
        stepUp
      />
      <ConfirmForm endpoint="/api/admin/retention" payload={{ action: "retry" }} label="Retry failed retention jobs" />
    </div>
  );
}
