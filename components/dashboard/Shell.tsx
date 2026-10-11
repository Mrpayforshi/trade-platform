import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { DisclosureMenu } from "@/components/ui/DisclosureMenu";
import { SidebarNav } from "./SidebarNav";

export type ShellProps = {
  displayName: string;
  email: string;
  readiness: { steps: { label: string; done: boolean }[]; done: number; total: number };
  children: ReactNode;
};

export function Shell({ displayName, email, readiness, children }: ShellProps) {
  const next = readiness.steps.find((s) => !s.done);

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="hidden shrink-0 border-r border-line bg-line/25 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:gap-4 md:overflow-y-auto md:p-3">
        <Link href="/dashboard" aria-label="Nexum command center" className="px-3 pb-1 pt-2">
          <Logo className="h-7 w-auto text-ink" />
        </Link>
        <SidebarNav />

        <div className="mt-auto flex flex-col gap-2 rounded-xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="font-bold">Trade readiness</span>
            <span className="text-xs font-semibold text-mute">
              {readiness.done} / {readiness.total}
            </span>
          </div>
          <div
            className="flex gap-1"
            role="img"
            aria-label={`${readiness.done} of ${readiness.total} setup steps complete`}
          >
            {readiness.steps.map((s) => (
              <span key={s.label} className={`h-1 flex-1 rounded-full ${s.done ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
          <p className="text-[13px] text-mute">
            {next ? `Still to do: ${next.label.toLowerCase()}.` : "Setup complete."}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-card/90 px-4 backdrop-blur md:px-8">
          <DisclosureMenu
            className="relative md:hidden"
            summaryClassName="flex min-h-10 cursor-pointer list-none items-center rounded-md border border-ink px-3 text-sm font-semibold"
            panelClassName="absolute left-0 top-12 max-h-[calc(100dvh-5rem)] w-[min(18rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-line bg-paper p-3 shadow-lg"
          >
            <SidebarNav />
          </DisclosureMenu>
          <p className="min-w-0 truncate font-semibold">{displayName}</p>
          <span className="hidden truncate text-sm text-mute sm:inline">{email}</span>
          <form action="/auth/signout" method="post" className="ml-auto">
            <button
              type="submit"
              className="min-h-10 rounded-md border border-line px-3 text-sm font-semibold hover:bg-line/60"
            >
              Log out
            </button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-300 flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
