"use client";

import { Form } from "@appica/ui-react/form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { Button } from "@appica/ui-react/button";
import { signUp } from "@/lib/auth/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { OrielMark } from "@/components/brand/oriel-mark";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <OrielMark className="size-8" />
        <span className="font-serif text-2xl">Oriel</span>
      </Link>
      <h1 className="font-serif text-3xl">Create an account</h1>
      <p className="mt-2 text-foreground-muted">Free forever. No premium tiers.</p>
      <Form
        className="mt-6 space-y-4"
        onFormSubmit={async (values) => {
          const result = await signUp.email({
            email: String(values.email ?? ""),
            password: String(values.password ?? ""),
            name: String(values.name ?? ""),
          });
          if (result.error) {
            setError(result.error.message ?? "Could not create account");
            return;
          }
          router.push("/onboarding");
          router.refresh();
        }}
      >
        <Field name="name">
          <FieldLabel>Name</FieldLabel>
          <Input autoComplete="name" required />
        </Field>
        <Field name="email">
          <FieldLabel>Email</FieldLabel>
          <Input type="email" autoComplete="email" required />
        </Field>
        <Field name="password">
          <FieldLabel>Password</FieldLabel>
          <Input type="password" autoComplete="new-password" required minLength={12} />
          <FieldDescription>At least 12 characters.</FieldDescription>
        </Field>
        {error ? <FieldError match>{error}</FieldError> : null}
        <Button type="submit" className="w-full">
          Create account
        </Button>
      </Form>
      <p className="mt-4 text-sm text-foreground-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
