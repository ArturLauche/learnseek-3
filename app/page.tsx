import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";
import { OrielMark } from "@/components/brand/oriel-mark";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 flex items-center gap-3">
        <OrielMark className="size-10" />
        <p className="font-serif text-3xl">Oriel</p>
      </div>
      <h1 className="font-serif text-5xl leading-tight font-normal text-foreground-intense">
        A window that lets in light.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-foreground-muted">
        Turn idle scrolling into useful microlearning. Each item takes 15 seconds to 3 minutes — an
        explanation, a worked example, a quiz, a correction, a small decision. Free for everyone. No
        subscriptions, no ads, no locked shelves.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/home" className={buttonVariants({ variant: "primary" })}>
          Open the feed
        </Link>
        <Link href="/sign-up" className={buttonVariants({ variant: "outline" })}>
          Create an account
        </Link>
        <Link href="/explore" className={buttonVariants({ variant: "ghost" })}>
          Explore topics
        </Link>
      </div>
      <ul className="mt-16 space-y-4 text-foreground-muted">
        <li>Anonymous browsing is welcome. Accounts keep saves, collections, and progress in sync.</li>
        <li>Bring your own compatible AI key if you self-host. Credentials stay encrypted and never display in full.</li>
        <li>Sources stay visible. Generated items say so. Private uploads stay private.</li>
      </ul>
    </main>
  );
}
