"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navGroups } from "@/lib/dashboard/nav";

function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

export function SidebarNav() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const groups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length > 0);

  const base = "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px]";

  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-0.5">
      <label className="relative mb-2 block">
        <span className="sr-only">Find a page</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute">
          <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find"
          className="h-10 w-full rounded-lg border border-line bg-card pl-9 pr-3 text-sm text-ink placeholder:text-mute focus:border-brand focus:outline-2 focus:outline-brand"
        />
      </label>

      {groups.map((g) => (
        <div key={g.label ?? "top"} className="flex flex-col gap-0.5">
          {g.label && (
            <p className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-mute">{g.label}</p>
          )}
          {g.items.map((item) => {
            if (!item.href) {
              return (
                <span key={item.label} aria-disabled="true" className={`${base} cursor-default font-medium text-mute`}>
                  <Icon d={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full border border-line px-2 py-px text-[10px] font-semibold uppercase tracking-wide">Soon</span>
                </span>
              );
            }
            const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${base} ${active ? "bg-line font-semibold" : "font-medium hover:bg-line/60"}`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {groups.length === 0 && <p className="px-3 py-2 text-sm text-mute">No pages match.</p>}
    </nav>
  );
}
