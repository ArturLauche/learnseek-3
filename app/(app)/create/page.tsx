import { getCurrentSession } from "@/lib/auth/permissions";
import { CreateForm } from "@/components/create/create-form";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";

export default async function CreatePage() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <Alert variant="info">
          <AlertTitle>Account required</AlertTitle>
          <AlertDescription>Uploads and drafts need an account so provenance and rights stay attached to you.</AlertDescription>
        </Alert>
        <Link href="/sign-in" className={`${buttonVariants({ variant: "primary" })} mt-6 inline-flex`}>
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-serif text-4xl">Create</h1>
      <p className="mt-2 text-foreground-muted">
        Confirm you have the right to use the material. Private uploads stay private. AI drafts are never published
        without your edit and safety checks.
      </p>
      <CreateForm />
    </div>
  );
}
