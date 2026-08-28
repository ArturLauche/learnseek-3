"use client";

import { useTheme } from "@appica/ui-react/hooks/use-theme";
import { Button } from "@appica/ui-react/button";
import { MoonStars, SunHigh } from "@appica/icons-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme, mounted } = useTheme();

  if (!mounted) {
    return <Button variant="ghost" size="icon-md" aria-label="Toggle theme" />;
  }

  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <Button
      variant="ghost"
      size="icon-md"
      aria-label={next === "dark" ? "Switch to dark theme" : "Switch to light theme"}
      onClick={() => setTheme(next)}
    >
      {resolvedTheme === "dark" ? <MoonStars /> : <SunHigh />}
    </Button>
  );
}
