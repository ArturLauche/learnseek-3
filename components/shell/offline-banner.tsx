"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="px-4 pt-3">
      <Alert variant="warning">
        <AlertTitle>You appear to be offline</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center gap-3">
          Prepared items already on this device still work. Reconnect and retry when you can.
          <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
