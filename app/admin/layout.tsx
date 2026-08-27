import { requirePermission } from "@/lib/auth/permissions";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/ai", label: "AI ops" },
  { href: "/admin/reco", label: "Recommendations" },
  { href: "/admin/flags", label: "Flags" },
  { href: "/admin/audit", label: "Audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("admin:access");
  return (
    <div className="admin-mono min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh">
        <aside className="w-56 border-e border-border p-5">
          <p className="mb-6 text-xs tracking-[0.25em] uppercase">Oriel Admin</p>
          <nav aria-label="Admin" className="flex flex-col gap-2">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/home" className={`${buttonVariants({ variant: "ghost", size: "sm" })} mt-10`}>
            Back to app
          </Link>
        </aside>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
