import { RouteShip } from "@/components/brand/RouteShip";

// The Nexum ship flying the China to Zimbabwe route above the search box. Same motion
// system as the Freight visual: pure SVG/CSS, no JS, and under prefers-reduced-motion the
// ship is hidden and the static route stays (rules in app/globals.css).

const ROUTE = "M60 120 C200 10 400 150 540 40";

export function RouteBand({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 160"
      role="img"
      aria-label="Route from suppliers in China to your doorstep in Zimbabwe"
      className={`block h-auto w-full ${className}`}
      fontFamily="var(--font-hanken)"
    >
      <path d={ROUTE} fill="none" stroke="var(--line)" strokeWidth="3" />
      <path className="arc" d={ROUTE} fill="none" stroke="var(--brand)" strokeWidth="3" />
      <circle cx="60" cy="120" r="9" fill="var(--ink)" />
      <circle cx="540" cy="40" r="9" fill="var(--amber)" />
      <g fill="var(--mute)" fontSize="13" textAnchor="middle">
        <text x="60" y="146">China</text>
        <text x="540" y="24">Zimbabwe</text>
      </g>
      <RouteShip d={ROUTE} size={44} dur={7} />
    </svg>
  );
}
