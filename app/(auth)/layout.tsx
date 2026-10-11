import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-280 items-center px-6">
        <Link href="/" aria-label="Nexum home">
          <Logo className="h-8 w-auto text-ink" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-20">
        {children}
      </main>
    </div>
  );
}
