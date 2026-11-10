"use client";

import { useId, useState, type ReactNode } from "react";

/** The expandable details under a result row. Opens on mouse hover (devices that have
 *  hover), and on tap, click or keyboard through the Details button on every device.
 *  The row itself must carry the `group` class so hover can reach this panel. */
export function OfferDetail({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="basis-full">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-sm font-semibold text-ink underline-offset-2 hover:underline"
      >
        {open ? "Hide details" : "Details"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : "group-hover:rotate-180"}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={id}
        aria-hidden={!open}
        className={`grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr] group-hover:grid-rows-[1fr]"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
