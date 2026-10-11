import type { Metadata } from "next";
import { Shell } from "@/components/dashboard/Shell";
import { getBuyerContext, getReadiness } from "@/lib/dashboard/queries";

export const metadata: Metadata = {
  title: { default: "Command center", template: "%s | Nexum" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { db, user, buyer } = await getBuyerContext();
  const email = user.email ?? buyer?.email ?? "";

  // Signed in, but no buyer profile (for example a supplier account).
  if (!buyer) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-20">
        <h1 className="text-3xl">This dashboard is for buyer accounts</h1>
        <p className="text-mute">
          You are signed in as {email}, but there is no buyer profile on this account. If you expected one, contact Nexum
          support.
        </p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-md border border-ink px-4 py-2 text-sm font-semibold">
            Log out
          </button>
        </form>
      </main>
    );
  }

  const readiness = await getReadiness(db, buyer);
  const displayName = buyer.business_name ?? (email.split("@")[0] || "Your business");

  return (
    <Shell displayName={displayName} email={email} readiness={readiness}>
      {children}
    </Shell>
  );
}
