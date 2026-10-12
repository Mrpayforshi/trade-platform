import type { CSSProperties } from "react";
import { SHIP } from "./Logo";

/*
 * The Nexum ship, flying a route. Same path as the logo mark (see Logo.tsx).
 * Both components are plain server components: all motion is SMIL or CSS, no JS.
 * Under prefers-reduced-motion the ship is hidden and the static route remains
 * (rules in app/globals.css).
 */

/**
 * Drop inside an <svg>. The ship flies the path `d` from its first point to its
 * last, in one continuous pass with no stops, then starts again. Draw `d` from
 * the supplier end to the doorstep end: the ship follows the direction it is drawn.
 * `size` is the ship's width in the parent svg's viewBox units.
 */
export function RouteShip({ d, size = 40, dur = 8 }: { d: string; size?: number; dur?: number }) {
  return (
    <g className="route-ship" aria-hidden="true" opacity="0">
      <animateMotion path={d} dur={`${dur}s`} repeatCount="indefinite" rotate="auto" calcMode="linear" />
      {/* fade in at the supplier, out at the doorstep, so the loop never snaps */}
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur={`${dur}s`} repeatCount="indefinite" />
      {/* the mark's nose points +x, so rotate="auto" turns it along the path; 388/337 is its centre */}
      <path d={SHIP} fill="#22A45D" fillRule="evenodd" transform={`scale(${size / 600}) translate(-388 -337)`} />
    </g>
  );
}

/**
 * For routes built from HTML (a dotted connector between stops) rather than one SVG path.
 * Put one in each connector, which must be `position: relative`. The ships run as a relay:
 * segment 0 first, then 1, and so on, so together they read as one ship making the whole trip.
 * `segments` is the number of connectors in the route (3 or 4, see app/globals.css).
 * Vertical by default; `responsive` makes it horizontal from md up, matching a connector
 * that turns from a vertical to a horizontal line at that breakpoint.
 */
export function LaneShip({ index, segments, size = 14, responsive = false }: { index: number; segments: 3 | 4; size?: number; responsive?: boolean }) {
  return (
    <svg
      viewBox="88 63 600 548"
      aria-hidden="true"
      focusable="false"
      className={`lane-ship lane-ship-${segments}${responsive ? " lane-ship-md-x" : ""}`}
      style={{ width: size, "--i": index } as CSSProperties}
    >
      <path d={SHIP} fill="#22A45D" fillRule="evenodd" />
    </svg>
  );
}
