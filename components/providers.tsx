"use client";

import { ThemeProvider } from "@appica/ui-react/providers/theme-provider";
import { DirectionProvider } from "@appica/ui-react/providers/direction-provider";
import { ToastProvider, Toaster } from "@appica/ui-react/toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="system" disableTransitionOnChange>
      <DirectionProvider>
        <ToastProvider>
          {children}
          <Toaster position="bottom-right" />
        </ToastProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
