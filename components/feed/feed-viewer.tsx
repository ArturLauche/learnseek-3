"use client";

import { useEffect, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@appica/ui-react/card";
import { Alert } from "@appica/ui-react/alert";
import { Spinner } from "@appica/ui-react/spinner";
import { Bookmark, EyeOff, Flag, Share, Sparkles } from "@appica/icons-react";

type FeedItem = {
  queueItemId: string;
  rankingFactors: Record<string, number | string>;
  item: {
    id: string;
    slug: string;
    title: string;
    learningObjective: string;
    bodyText: string;
    durationSeconds: number;
    format: string;
    language: string;
    difficulty: string;
    origin: string;
    safetyClass: string;
  };
};

export function FeedViewer() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feed")
      .then(async (res) => {
        if (!res.ok) throw new Error("Feed unavailable");
        return res.json() as Promise<{ items: FeedItem[] }>;
      })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowDown" || event.key === "j") setIndex((i) => Math.min(items.length - 1, i + 1));
      if (event.key === "ArrowUp" || event.key === "k") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Spinner aria-label="Loading feed" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">
          {error}. Cached editorial items should appear after seed. Retry after checking Postgres, Redis, and MinIO.
        </Alert>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <Alert variant="info">
          Seed the database (`pnpm db:seed`) so Oriel can serve a rolling queue without waiting on an AI provider.
        </Alert>
      </div>
    );
  }

  const current = items[index];
  if (!current) return null;

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-2xl flex-col justify-center px-4 py-6">
      <p className="mb-3 text-xs tracking-[0.2em] text-foreground-subtle uppercase">
        {index + 1} / {items.length} prepared
      </p>
      <Card frame="solid" className="min-h-[70vh] border-border">
        <CardHeader>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline">{current.item.format.replaceAll("_", " ")}</Badge>
            <Badge variant="soft">{current.item.durationSeconds}s</Badge>
            <Badge variant="secondary">{current.item.origin.replaceAll("_", " ")}</Badge>
            <Badge variant="info">{current.item.difficulty}</Badge>
          </div>
          <CardTitle className="font-serif text-3xl leading-snug font-normal" render={<h1 />}>
            {current.item.title}
          </CardTitle>
          <CardDescription>{current.item.learningObjective}</CardDescription>
        </CardHeader>
        <div className="prose-oriel max-w-none text-[1.05rem] leading-7 text-foreground">
          {current.item.bodyText.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)} className="mb-4">
              {para}
            </p>
          ))}
        </div>
        <CardFooter className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Bookmark data-icon="start" />
            Save
          </Button>
          <Button variant="ghost" size="sm">
            <Sparkles data-icon="start" />
            Explain deeper
          </Button>
          <Button variant="ghost" size="sm">
            Simplify
          </Button>
          <Button variant="ghost" size="sm">
            Show example
          </Button>
          <Button variant="ghost" size="sm">
            <Share data-icon="start" />
            Share
          </Button>
          <Button variant="ghost" size="sm">
            <EyeOff data-icon="start" />
            Hide
          </Button>
          <Button variant="ghost" size="sm">
            <Flag data-icon="start" />
            Report
          </Button>
        </CardFooter>
      </Card>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Previous
        </Button>
        <Button onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))} disabled={index === items.length - 1}>
          Next item
        </Button>
      </div>
    </section>
  );
}
