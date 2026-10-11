import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Get started" };

type StepState = "done" | "now" | "next";

const badge: Record<StepState, string> = {
  done: "border-brand bg-brand text-white",
  now: "border-amber bg-amber text-[#14213d]",
  next: "border-line text-mute",
};
const badgeText: Record<StepState, string> = { done: "Done", now: "Next", next: "Later" };

export default async function GetStartedPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal/get-started");

  // Runs as the logged-in user, so RLS (users_select_own_or_admin) applies.
  const { data: buyer } = await supabase
    .from("users")
    .select("business_name, phone")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Supplier and admin logins have no buyer row.
  if (!buyer) {
    return (
      <div className="max-w-xl rounded-lg border border-line bg-card p-6">
        <h1 className="mb-2 text-2xl">This isn&apos;t a buyer account</h1>
        <p className="mb-4 text-[15px] text-mute">
          You are signed in as {user.email}, which has no buyer profile. Log out and sign in with
          your buyer account, or contact the Nexum team.
        </p>
        <form action={signOut}>
          <button type="submit" className="rounded-md border border-ink px-4 py-2 text-[15px] font-semibold">
            Log out
          </button>
        </form>
      </div>
    );
  }

  const steps: { title: string; detail: string; state: StepState }[] = [
    {
      title: "Account created",
      detail: `Signed in as ${user.email}.`,
      state: "done",
    },
    {
      title: "Business profile",
      detail: buyer.business_name
        ? `${buyer.business_name}${buyer.phone ? ` · ${buyer.phone}` : ""}`
        : "Add your business name so suppliers and the Nexum team know who is buying.",
      state: buyer.business_name ? "done" : "now",
    },
    {
      title: "Request a quote",
      detail:
        "Tell us what you need to import: category, quantity and specification. The Nexum team matches you with curated suppliers.",
      state: buyer.business_name ? "now" : "next",
    },
    {
      title: "Business verification",
      detail:
        "Completed when you accept a quote, and only as far as the order requires. Nexum will tell you which documents are needed.",
      state: "next",
    },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-[clamp(28px,4vw,40px)] tracking-tight">Get started with Nexum</h1>
      <p className="mb-8 text-[15px] text-mute">
        Four steps from sign-up to your first order. Verification, permits and payment steps come
        after you have a quote you want to accept.
      </p>
      <ol className="divide-y divide-line rounded-lg border border-line bg-card">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4 p-5">
            <span className="mt-0.5 w-6 shrink-0 text-center font-semibold text-mute">{i + 1}</span>
            <div className="flex-1">
              <h2 className="mb-1 text-xl">{s.title}</h2>
              <p className="text-[15px] text-mute">{s.detail}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge[s.state]}`}>
              {badgeText[s.state]}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-mute">
        The quote request form is the next screen we build. Until then the Nexum team can raise a
        request on your behalf.
      </p>
    </div>
  );
}
