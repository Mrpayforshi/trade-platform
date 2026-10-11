import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex h-16 max-w-280 items-center justify-between px-6">
          <Link href="/" aria-label="Nexum home"><Logo className="h-8 w-auto text-ink" /></Link>
          <Link href="/" className="text-sm font-medium text-mute hover:text-ink">Back to site</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-12">{children}</main>
    </>
  );
}
