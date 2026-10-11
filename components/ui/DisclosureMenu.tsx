"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  /** Classes for the <details> element (position, breakpoint visibility). */
  className?: string;
  /** Classes for the summary button. */
  summaryClassName: string;
  /** Classes for the dropdown panel. */
  panelClassName: string;
  label?: string;
  children: ReactNode;
};

/**
 * Mobile menu built on <details>. Works without JS, and with JS it also
 * closes when a link inside is tapped, on route change, on Escape, and on
 * a tap outside, so it never stays open over the next page.
 */
export function DisclosureMenu({ className, summaryClassName, panelClassName, label = "Menu", children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName}>{label}</summary>
      <div
        className={panelClassName}
        onClick={(e) => {
          if (ref.current && (e.target as HTMLElement).closest("a")) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
