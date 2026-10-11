"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary } from "@/components/site/ui";

type Props = {
  mode: "login" | "signup";
  /** Already validated by safeNext() on the server. */
  next: string;
  initialError?: string | null;
};

const field =
  "mt-1 block w-full rounded-md border border-line bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-mute focus:border-brand focus:outline-2 focus:outline-brand";

export function AuthForm({ mode, next, initialError = null }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const business = String(form.get("business") ?? "").trim();

    if (isSignup && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }

    setPending(true);
    const supabase = createClient();

    if (!isSignup) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(
          "That email and password do not match, or your email is not confirmed yet."
        );
        setPending(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: business ? { business_name: business } : {},
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }
    // With email confirmation switched off Supabase returns a session at once.
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setNotice("Check your email to confirm your account, then log in.");
    setPending(false);
  }

  const otherHref = `${isSignup ? "/login" : "/signup"}${
    next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  return (
    <div>
      <h1 className="text-3xl">{isSignup ? "Create your account" : "Log in"}</h1>
      <p className="mt-2 text-mute">
        {isSignup
          ? "Buy from verified Chinese suppliers and track every order to your door."
          : "Welcome back. Pick up your orders where you left them."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate={false}>
        {isSignup && (
          <label className="block text-sm font-medium">
            Business name
            <input
              name="business"
              type="text"
              autoComplete="organization"
              maxLength={120}
              placeholder="Your company"
              className={field}
            />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={field}
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={field}
          />
          {isSignup && <span className="mt-1 block text-[13px] font-normal text-mute">At least 8 characters.</span>}
        </label>

        <div aria-live="polite" className="min-h-5 text-sm">
          {error && <p className="text-brick dark:text-amber">{error}</p>}
          {notice && <p className="text-brand">{notice}</p>}
        </div>

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full text-center disabled:opacity-60`}>
          {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-mute">
        {isSignup ? "Already have an account? " : "New to Nexum? "}
        <Link href={otherHref} className="font-semibold text-ink underline">
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
