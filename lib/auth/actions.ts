"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export type AuthState =
  | { error?: string; notice?: "check-email"; email?: string }
  | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,19}$/;
const DEFAULT_NEXT = "/portal/get-started";

// Only allow same-site relative paths, so ?next= can't be used as an open redirect.
function safeNext(raw: FormDataEntryValue | null): string {
  const v = typeof raw === "string" ? raw : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : DEFAULT_NEXT;
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const consent = formData.get("consent") === "on";

  if (!businessName) return { error: "Enter your business name.", email };
  if (businessName.length > 200) return { error: "Business name is too long.", email };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address.", email };
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", email };
  if (phone && !PHONE_RE.test(phone)) {
    return { error: "Enter a valid phone number, for example +263 77 123 4567.", email };
  }
  if (!consent) {
    return { error: "Please accept the Terms and Privacy Notice to create an account.", email };
  }

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) {
    console.error("signUp: no Origin header and NEXT_PUBLIC_SITE_URL is not set");
    return { error: "We couldn't create your account. Please try again.", email };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(DEFAULT_NEXT)}`,
      // Copied onto public.users by the handle_new_auth_user() trigger (migration 0017).
      // terms_accepted_at is kept on auth.users as a record of consent.
      data: {
        business_name: businessName,
        contact_phone: phone || undefined,
        terms_accepted_at: new Date().toISOString(),
      },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { error: "That password is too weak. Try a longer or less common one.", email };
    }
    console.error("signUp failed:", error.code, error.message);
    return { error: "We couldn't create your account. Please try again.", email };
  }

  // Email confirmation switched off in Supabase: user is already signed in.
  if (data.session) redirect(DEFAULT_NEXT);

  // Confirmation on: Supabase returns an obfuscated user for already-registered
  // emails, so this message is shown either way (no account enumeration).
  return { notice: "check-email", email };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email and password.", email };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirm your email first. Check your inbox for the link we sent.", email };
    }
    return { error: "Email or password is incorrect.", email };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
