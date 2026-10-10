import Link from "next/link";
import { nav } from "@/lib/site-content";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line py-10 text-sm text-mute">
      <div className="mx-auto grid max-w-280 gap-6 px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <p><b className="text-ink">Nexum</b><br />A managed China→Zimbabwe trade corridor. Nexum is a trade platform; it is not a government authority, bank or customs agent.</p>
        {nav.slice(0, 2).map((g) => (
          <div key={g.label}>
            <b className="text-ink">{g.label}</b>
            {g.items.map((i) => <Link key={i.href} href={i.href} className="block py-0.5">{i.label}</Link>)}
          </div>
        ))}
        <div>
          <b className="text-ink">Company</b>
          <Link href="/suppliers" className="block py-0.5">Suppliers</Link>
          <Link href="/about" className="block py-0.5">About</Link>
        </div>
      </div>
    </footer>
  );
}
