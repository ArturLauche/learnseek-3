"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Navigation,
  NavigationItem,
  NavigationLink,
  NavigationList,
} from "@appica/ui-react/navigation";
import { Badge } from "@appica/ui-react/badge";
import { Bell, Compass, Home, Library, Plus, Search, User } from "@appica/icons-react";
import { OrielMark } from "@/components/brand/oriel-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_ITEMS, activeNavFromPath } from "@/components/shell/nav";
import { buttonVariants } from "@appica/ui-react/button";
import { OfflineBanner } from "@/components/shell/offline-banner";

const ICONS = {
  home: Home,
  explore: Compass,
  search: Search,
  library: Library,
  create: Plus,
  notifications: Bell,
  profile: User,
};

export function AppShell({
  children,
  signedIn,
  unread = 0,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  unread?: number;
}) {
  const pathname = usePathname();
  const active = activeNavFromPath(pathname);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex min-h-dvh max-w-7xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-border-muted p-5 md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2 text-foreground-intense">
            <OrielMark className="size-8" />
            <span className="font-serif text-2xl tracking-tight">Oriel</span>
          </Link>
          <Navigation aria-label="Primary" orientation="vertical" variant="pill" activeLink={active} className="w-full">
            <NavigationList>
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.value];
                return (
                  <NavigationItem key={item.value}>
                    <NavigationLink value={item.value} className="w-full" render={<Link href={item.href} />}>
                      <Icon data-icon="start" />
                      {item.label}
                      {item.value === "notifications" && unread > 0 ? (
                        <Badge variant="secondary" size="sm" data-icon="end">
                          {unread}
                        </Badge>
                      ) : null}
                    </NavigationLink>
                  </NavigationItem>
                );
              })}
            </NavigationList>
          </Navigation>
          <div className="mt-auto flex items-center justify-between gap-2 pt-6">
            <ThemeToggle />
            {signedIn ? (
              <Link href="/profile" className="text-sm text-foreground-muted">
                Account
              </Link>
            ) : (
              <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Sign in
              </Link>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border-muted px-4 py-3 md:hidden">
            <Link href="/" className="flex items-center gap-2">
              <OrielMark className="size-7" />
              <span className="font-serif text-xl">Oriel</span>
            </Link>
            <ThemeToggle />
          </header>
          <main id="main" className="flex-1 pb-24 md:pb-8">
            <OfflineBanner />
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden"
      >
        <Navigation aria-label="Mobile" variant="line" size="sm" activeLink={active} className="max-w-full">
          <NavigationList className="grid grid-cols-7 px-1">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.value];
              return (
                <NavigationItem key={item.value}>
                  <NavigationLink
                    value={item.value}
                    className="flex-col gap-0.5 text-[0.65rem]"
                    render={<Link href={item.href} />}
                  >
                    <Icon data-icon="start" />
                    {item.label}
                  </NavigationLink>
                </NavigationItem>
              );
            })}
          </NavigationList>
        </Navigation>
      </nav>
    </div>
  );
}
