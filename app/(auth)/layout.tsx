import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { signOut } from "@/lib/auth/actions";

// Auth is enforced in each page (layouts don't re-run on client navigation)
// and by RLS. This layout is chrome only.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-280 items-center justify-between px-6">
          <Link href="/" aria-label="Nexum home"><Logo className="h-8 w-auto text-ink" /></Link>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-ink px-3 py-1.5 text-sm font-semibold">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-280 flex-1 px-6 py-10">{children}</main>
    </>
  );
}
