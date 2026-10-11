import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/portal/get-started");

  return (
    <>
      <h1 className="mb-2 text-[clamp(28px,4vw,36px)] tracking-tight">Create your buyer account</h1>
      <p className="mb-6 text-[15px] text-mute">
        Set up your business profile and request quotes from Nexum&apos;s curated suppliers.
        Business verification happens later, only when an order needs it.
      </p>
      <SignupForm />
    </>
  );
}
