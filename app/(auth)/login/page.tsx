import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { safeNext } from "@/lib/auth/safe-next";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error =
    sp.error === "confirmation_failed"
      ? "That confirmation link has expired or was already used. Log in, or sign up again."
      : null;

  return <AuthForm mode="login" next={next} initialError={error} />;
}
