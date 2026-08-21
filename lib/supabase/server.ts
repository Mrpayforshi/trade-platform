import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Use inside Server Components / Route Handlers when you want the request
// to run AS the logged-in user, subject to RLS. This is what most reads
// should use.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware refreshes the
            // session instead — safe to ignore
          }
        },
      },
    }
  );
}

// Service-role client — bypasses RLS entirely. Per Part 5 of the backend
// doc: SUPABASE_SERVICE_ROLE_KEY must never reach client code. This file
// is server-only (no "use client"), and the key is read from a non-
// NEXT_PUBLIC_ env var, so it can't leak into the browser bundle.
// Use ONLY for: state-machine transitions, platform_fees writes,
// audit_log-adjacent server logic that must bypass RLS by design.
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, never NEXT_PUBLIC_)."
    );
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
