"use client";

import { useEffect, useRef, useState } from "react";

const ALLOWED = new Set(["completion", "answer", "score", "height", "restart"]);

export function LearningFrame({
  src,
  title,
  fallbackText,
}: {
  src: string;
  title: string;
  fallbackText?: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(360);
  const [failed, setFailed] = useState(false);
  const [frameSrc, setFrameSrc] = useState(src);

  useEffect(() => {
    try {
      const url = new URL(src);
      url.searchParams.set("parent", window.location.origin);
      setFrameSrc(url.toString());
    } catch {
      setFrameSrc(src);
    }
  }, [src]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.origin !== "null" && !frameSrc.startsWith(event.origin)) return;
      const data = event.data as { type?: string; height?: number };
      if (!data || typeof data.type !== "string" || !ALLOWED.has(data.type)) return;
      if (data.type === "height" && typeof data.height === "number") {
        setHeight(Math.min(900, Math.max(240, data.height)));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameSrc]);

  return (
    <div>
      <iframe
        ref={frame}
        title={title}
        src={frameSrc}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        allow=""
        className="w-full rounded-md border border-border bg-background"
        style={{ height }}
        onError={() => setFailed(true)}
      />
      {fallbackText ? (
        <details className="mt-3 text-sm">
          <summary>Text version of this scene</summary>
          <p className="mt-2 whitespace-pre-wrap text-foreground-muted">{fallbackText}</p>
        </details>
      ) : null}
      {failed ? (
        <p role="alert" className="mt-2 text-sm text-foreground-muted">
          The interactive scene could not load. Use the text version above.
        </p>
      ) : null}
    </div>
  );
}
