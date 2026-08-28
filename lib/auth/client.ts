"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? process.env.NEXT_PUBLIC_APP_URL : undefined,
});

export const { useSession, signIn, signUp, signOut } = authClient;
