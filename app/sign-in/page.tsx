"use client";

import { Form } from "@appica/ui-react/form";
import { Field, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Button } from "@appica/ui-react/button";
import { signIn } from "@/lib/auth/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrielMark } from "@/components/brand/oriel-mark";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <OrielMark className="size-8" />
        <span className="font-serif text-2xl">Oriel</span>
      </Link>
      <h1 className="font-serif text-3xl">Sign in</h1>
      <Form
        className="mt-6 space-y-4"
        onFormSubmit={async (values) => {
          const result = await signIn.email({
            email: String(values.email ?? ""),
            password: String(values.password ?? ""),
          });
          if (result.error) {
            setError(result.error.message ?? "Could not sign in");
            return;
          }
          router.push("/home");
          router.refresh();
        }}
      >
        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input type="email" autoComplete="email" required />
        </Field>
        <Field name="password">
          <FieldLabel>Password</FieldLabel>
          <Input type="password" autoComplete="current-password" required />
        </Field>
        {error ? <FieldError match>{error}</FieldError> : null}
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </Form>
      <p className="mt-4 text-sm text-foreground-muted">
        New here?{" "}
        <Link href="/sign-up" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
