export const NAV_ITEMS = [
  { href: "/home", value: "home", label: "Home" },
  { href: "/explore", value: "explore", label: "Explore" },
  { href: "/search", value: "search", label: "Search" },
  { href: "/library", value: "library", label: "Library" },
  { href: "/create", value: "create", label: "Create" },
  { href: "/notifications", value: "notifications", label: "Notifications" },
  { href: "/profile", value: "profile", label: "Profile" },
] as const;

export type NavValue = (typeof NAV_ITEMS)[number]["value"];

export function activeNavFromPath(pathname: string): NavValue {
  const match = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.value ?? "home";
}
