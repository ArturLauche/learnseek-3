"use client";

import { Button } from "@appica/ui-react/button";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <Alert variant="error">
        <AlertTitle>This page hit a snag</AlertTitle>
        <AlertDescription>You can retry. If it keeps happening, check service health at /api/health.</AlertDescription>
      </Alert>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
