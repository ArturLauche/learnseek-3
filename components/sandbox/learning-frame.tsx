"use client";

import { useEffect, useRef, useState } from "react";

const ALLOWED = new Set(["completion", "answer", "score", "height", "restart"]);

export function LearningFrame({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(360);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.origin !== "null" && !src.startsWith(event.origin)) return;
      const data = event.data as { type?: string; height?: number };
      if (!data || typeof data.type !== "string" || !ALLOWED.has(data.type)) return;
      if (data.type === "height" && typeof data.height === "number") {
        setHeight(Math.min(900, Math.max(240, data.height)));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [src]);

  return (
    <iframe
      ref={frame}
      title={title}
      src={src}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className="w-full rounded-md border border-border bg-background"
      style={{ height }}
    />
  );
}
