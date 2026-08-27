import { auth } from "@/lib/auth";

export async function verifyStepUpPassword(email: string, password: string | undefined) {
  if (!password || password.length < 12) return false;
  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
    });
    return Boolean(result.user?.id);
  } catch {
    return false;
  }
}
