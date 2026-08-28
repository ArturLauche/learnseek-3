"use client";

import { Button } from "@appica/ui-react/button";
import { useRouter } from "next/navigation";

export function MarkReadButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  if (ids.length === 0) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-4"
      onClick={async () => {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        router.refresh();
      }}
    >
      Mark visible as read
    </Button>
  );
}
