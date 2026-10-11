"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "@/lib/auth/actions";
import { btnPrimary } from "@/components/site/ui";
import { Field, FormError } from "./Field";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, undefined);

  if (state?.notice === "check-email") {
    return (
      <div className="rounded-lg border border-line bg-card p-6">
        <h2 className="mb-2 text-2xl">Check your email</h2>
        <p className="text-[15px] text-mute">
          If this address can be registered, we have sent a confirmation link to{" "}
          <span className="font-semibold text-ink">{state.email}</span>. Open it to finish setting
          up your account. It may take a minute to arrive; check spam if you don&apos;t see it.
        </p>
        <p className="mt-4 text-[15px]">
          Already confirmed?{" "}
          <Link href="/login" className="font-semibold underline">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-lg border border-line bg-card p-6" noValidate>
      <FormError message={state?.error} />
      <Field
        label="Business name"
        name="business_name"
        autoComplete="organization"
        required
        maxLength={200}
      />
      <Field
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state?.email}
        required
      />
      <Field
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+263 77 123 4567"
        hint="Used for order updates. WhatsApp updates are only sent if you opt in later."
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="At least 8 characters."
      />
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="font-semibold underline">Terms</Link> and have read the{" "}
          <Link href="/privacy" className="font-semibold underline">Privacy Notice</Link>.
        </span>
      </label>
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full text-center disabled:opacity-60`}>
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-mute">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-ink underline">Log in</Link>
      </p>
    </form>
  );
}
