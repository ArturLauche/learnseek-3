"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-lg px-6 py-16">
          <h1 className="font-serif text-3xl">Something broke</h1>
          <p className="mt-3 text-sm opacity-80">{error.message}</p>
          <button type="button" onClick={reset}>
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
