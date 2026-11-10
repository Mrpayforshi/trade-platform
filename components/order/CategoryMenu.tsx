"use client";

import { useState } from "react";
import type { CategoryGroup } from "@/lib/order/categories";

/** The category submenu inside the search box. Picking an item adds (or removes) a line in
 *  the list; it does not run the search. Where `availability` is given (the Start order
 *  page), each item says how many approved suppliers match it today. */
export function CategoryMenu({
  groups,
  availability,
  isPicked,
  onToggle,
  note,
}: {
  groups: CategoryGroup[];
  availability?: Record<string, number>;
  isPicked: (item: string) => boolean;
  onToggle: (item: string) => void;
  note: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const group = groups.find((g) => g.id === open) ?? null;

  return (
    <div className="border-b border-line px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span id="cat-label" className="mr-1 text-sm font-semibold">
          Browse by category
        </span>
        {groups.map((g) => {
          const on = g.id === open;
          return (
            <button
              key={g.id}
              type="button"
              aria-expanded={on}
              aria-controls="cat-items"
              onClick={() => setOpen(on ? null : g.id)}
              className={`min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink"
              }`}
            >
              {g.name} <span aria-hidden="true">{on ? "▴" : "▾"}</span>
            </button>
          );
        })}
      </div>

      <div id="cat-items" role="group" aria-labelledby="cat-label" hidden={!group} className="mt-3">
        {group && (
          <ul className="flex flex-wrap gap-2">
            {group.items.map((item) => {
              const picked = isPicked(item);
              const n = availability?.[item];
              return (
                <li key={item}>
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => onToggle(item)}
                    className={`flex min-h-10 flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors ${
                      picked ? "border-brand bg-brand/10" : "border-line bg-card hover:border-brand"
                    }`}
                  >
                    <span className="text-[15px] font-medium">
                      <span aria-hidden="true">{picked ? "✓ " : "+ "}</span>
                      {item}
                    </span>
                    {n != null && (
                      <span className={`text-xs ${n > 0 ? "text-brand" : "text-mute"}`}>
                        {n > 0 ? `${n} ${n === 1 ? "supplier" : "suppliers"}` : "No suppliers yet"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="sr-only" role="status">
        {note}
      </p>
    </div>
  );
}
