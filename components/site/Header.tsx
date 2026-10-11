import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { nav } from "@/lib/site-content";
import { btnPrimary } from "./ui";

const link = "block rounded-md px-3 py-2 text-[15px] font-medium hover:bg-line";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-280 items-center gap-6 px-6">
        <Link href="/" aria-label="Nexum home"><Logo className="h-8 w-auto text-ink" /></Link>
        <nav aria-label="Main" className="hidden flex-1 gap-1 md:flex">
          {nav.map((g) =>
            g.items.length > 1 ? (
              <div key={g.label} className="group relative">
                <button type="button" className={link}>{g.label} ▾</button>
                <div className="invisible absolute left-0 top-full min-w-64 rounded-lg border border-line bg-card p-1.5 group-focus-within:visible group-hover:visible">
                  {g.items.map((i) => (
                    <Link key={i.href} href={i.href} className={link}>
                      {i.label}
                      <span className="block text-[13px] font-normal text-mute">{i.hint}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={g.label} href={g.items[0].href} className={link}>{g.label}</Link>
            ),
          )}
        </nav>
        <Link href="/login" className={`${link} hidden md:block`}>Log in</Link>
        <Link href="/signup" className={`${btnPrimary} hidden md:inline-block`}>Get started</Link>
        <details className="ml-auto md:hidden">
          <summary className="cursor-pointer list-none rounded-md border border-ink px-3 py-2 text-sm font-semibold">Menu</summary>
          <div className="absolute inset-x-0 top-16 flex flex-col border-b border-line bg-paper p-4">
            {nav.flatMap((g) => g.items).map((i) => <Link key={i.href} href={i.href} className={link}>{i.label}</Link>)}
            <Link href="/login" className={link}>Log in</Link>
            <Link href="/signup" className={`${link} font-semibold`}>Get started</Link>
          </div>
        </details>
      </div>
    </header>
  );
}
