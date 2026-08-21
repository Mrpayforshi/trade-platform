import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components. Runs under the `anon` key — RLS policies
// decide what's actually visible. Never import this into API routes that
// need to write transactions/fees/audit_logs; use server.ts for that.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
