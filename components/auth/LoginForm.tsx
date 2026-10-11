"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "@/lib/auth/actions";
import { btnPrimary } from "@/components/site/ui";
import { Field, FormError } from "./Field";

export function LoginForm({ next, confirmed }: { next: string; confirmed?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, undefined);

  return (
    <form action={action} className="space-y-4 rounded-lg border border-line bg-card p-6" noValidate>
      {confirmed ? (
        <p className="rounded-md border border-line px-3 py-2 text-sm text-mute">
          If you have confirmed your email, log in below to continue.
        </p>
      ) : null}
      <FormError message={state?.error} />
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state?.email}
        required
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full text-center disabled:opacity-60`}>
        {pending ? "Logging in…" : "Log in"}
      </button>
      <p className="text-center text-sm text-mute">
        New to Nexum?{" "}
        <Link href="/signup" className="font-semibold text-ink underline">Create an account</Link>
      </p>
    </form>
  );
}
