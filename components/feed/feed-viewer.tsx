"use client";

import { useEffect, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@appica/ui-react/card";
import { Alert } from "@appica/ui-react/alert";
import { Spinner } from "@appica/ui-react/spinner";
import { Bookmark, EyeOff, Flag, Share, Sparkles } from "@appica/icons-react";
import Link from "next/link";
import { QuizForm } from "@/components/learn/quiz-form";

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
    sources?: { title: string; url: string | null; citation: string | null }[];
    quiz?: { id: string; title: string; questions: { id: string; prompt: string; choices: string[] }[] } | null;
  };
};

export function FeedViewer() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadFeed() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error("Feed unavailable");
      const data = (await res.json()) as { items: FeedItem[] };
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feed unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function interact(kind: string, extra?: Record<string, unknown>) {
    if (!items[index]) return;
    const contentItemId = items[index].item.id;
    const path =
      kind === "save"
        ? "/api/saves"
        : kind === "report"
          ? "/api/reports"
          : kind === "react"
            ? "/api/reactions"
            : "/api/feed/interact";
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, kind, ...extra }),
      });
      if (res.status === 401) {
        setNotice("Sign in to keep this across devices.");
        return;
      }
      if (!res.ok) {
        setNotice("That action did not save. Try again.");
        return;
      }
    } catch {
      setNotice("That action did not save. Reconnect and retry.");
      return;
    }
    if (kind === "save") setNotice("Saved to your library.");
    if (kind === "hide") {
      setNotice("We will show fewer items like this.");
      setItems((current) => current.filter((_, i) => i !== index));
      setIndex((i) => Math.max(0, Math.min(i, items.length - 2)));
    }
    if (kind === "report") setNotice("Report recorded for moderation.");
    if (kind === "share") {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${items[index].item.slug}`);
      setNotice("Share link copied. Source links stay with the public page.");
    }
    if (kind === "explain_deeper" || kind === "simplify" || kind === "show_example" || kind === "follow_up") {
      setNotice(
        "Logged. When an AI provider is configured, a follow-up item is queued; until then the feed stays on prepared content.",
      );
    }
    if (kind === "react") setNotice("Reaction saved.");
  }

  useEffect(() => {
    void loadFeed();
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
        <Button className="mt-4" variant="outline" onClick={() => void loadFeed()}>
          Retry feed
        </Button>
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
        {notice ? <p className="mb-3 text-sm text-foreground-muted">{notice}</p> : null}
        <div className="prose-oriel max-w-none text-[1.05rem] leading-7 text-foreground">
          {current.item.bodyText.split("\n\n").map((para) => (
            <p key={para.slice(0, 24)} className="mb-4">
              {para}
            </p>
          ))}
        </div>
        {current.item.quiz ? (
          <QuizForm quizId={current.item.quiz.id} questions={current.item.quiz.questions} />
        ) : null}
        {current.item.sources && current.item.sources.length > 0 ? (
          <ul className="mt-4 text-sm text-foreground-muted">
            {current.item.sources.map((source) => (
              <li key={source.title}>
                <a className="underline" href={source.url ?? undefined} rel="noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <CardFooter className="mt-6 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void interact("save")}>
            <Bookmark data-icon="start" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("react", { kind: "useful" })}>
            Useful
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("explain_deeper")}>
            <Sparkles data-icon="start" />
            Explain deeper
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("simplify")}>
            Simplify
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("show_example")}>
            Show example
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("follow_up")}>
            Follow-up
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("share")}>
            <Share data-icon="start" />
            Share
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("hide")}>
            <EyeOff data-icon="start" />
            Hide
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void interact("report")}>
            <Flag data-icon="start" />
            Report
          </Button>
          <Link href={`/learn/${current.item.slug}`} className="text-sm underline">
            Open full item
          </Link>
        </CardFooter>
      </Card>
      <div className="mt-4 flex justify-between">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          Previous
        </Button>
        <Button
          onClick={() => {
            const currentItem = items[index];
            if (currentItem) {
              void fetch("/api/feed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contentItemId: currentItem.item.id,
                  queueItemId: currentItem.queueItemId,
                }),
              });
              void interact("complete", { value: currentItem.item.durationSeconds });
            }
            setIndex((i) => Math.min(items.length - 1, i + 1));
          }}
          disabled={index === items.length - 1}
        >
          Next item
        </Button>
      </div>
    </section>
  );
}
