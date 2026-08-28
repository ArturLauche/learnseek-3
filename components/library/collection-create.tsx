"use client";

import { useState } from "react";
import { Input } from "@appica/ui-react/input";
import { Button } from "@appica/ui-react/button";
import { useRouter } from "next/navigation";

export function CollectionCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  return (
    <form
      className="mb-4 flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, visibility: "private" }),
        });
        setTitle("");
        router.refresh();
      }}
    >
      <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New collection" aria-label="Collection title" />
      <Button type="submit" size="sm">
        Create
      </Button>
    </form>
  );
}
