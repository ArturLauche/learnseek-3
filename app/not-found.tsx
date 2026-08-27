import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-serif text-4xl">No window here</h1>
      <p className="mt-3 text-foreground-muted">That path is empty. Try the feed or search.</p>
      <Link href="/home" className={`${buttonVariants({ variant: "primary" })} mt-6 inline-flex`}>
        Home
      </Link>
    </main>
  );
}
