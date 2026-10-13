"use client";

import { useEffect, useRef } from "react";

/** The "search is done" signal. It sits at the top of the results, announces the outcome to
 *  screen readers, and brings the results into view when a new search lands, so nobody has to
 *  scroll down and wonder whether it went through. */
export function SearchComplete({
  listKey,
  items,
  options,
  unmatched,
  member,
}: {
  listKey: string;
  items: number;
  options: number;
  unmatched: number;
  member: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastList = useRef<string | null>(null);

  useEffect(() => {
    // Only a new list scrolls; switching the "Compare by" tab keeps the reader where they are.
    if (lastList.current === listKey) return;
    lastList.current = listKey;
    const el = ref.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  }, [listKey]);

  const none = options === 0;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <div
      ref={ref}
      id="results"
      tabIndex={-1}
      role="status"
      aria-live="polite"
      className="mb-6 scroll-mt-24 rounded-lg border border-line border-l-[4px] border-l-brand bg-card px-4 py-3 outline-none"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2 font-semibold text-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12.5l3 3 5-6" />
          </svg>
          Search complete
        </span>
        <span className="text-[15px] text-mute">
          {none
            ? `No supplier matches yet for ${plural(items, "item")}. Try a simpler name.`
            : `${plural(options, "option")} found for ${plural(items - unmatched, "item")}${unmatched ? `, ${unmatched} with no match` : ""}.`}
          {!member && !none && " Sign up to see every match and supplier name."}
        </span>
      </p>
    </div>
  );
}
