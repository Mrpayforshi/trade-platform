import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Log in" };

function safeNext(raw?: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/portal/get-started";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next: rawNext, notice } = await searchParams;
  const next = safeNext(rawNext);

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <>
      <h1 className="mb-2 text-[clamp(28px,4vw,36px)] tracking-tight">Log in</h1>
      <p className="mb-6 text-[15px] text-mute">Welcome back to Nexum.</p>
      <LoginForm next={next} confirmed={notice === "confirmed"} />
    </>
  );
}
