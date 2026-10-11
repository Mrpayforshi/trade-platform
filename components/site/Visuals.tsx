import type { ReactNode } from "react";

const Svg = ({ label, children }: { label: string; children: ReactNode }) => (
  <svg viewBox="0 0 320 150" role="img" aria-label={label} className="mx-auto block w-full max-w-85" fontSize="11" fontFamily="var(--font-hanken)">
    {children}
  </svg>
);

const Row = ({ y, o, c, l }: { y: number; o: number; c: string; l: string }) => (
  <g opacity={o}>
    <rect x="24" y={y} width="272" height="36" rx="6" fill="var(--card)" stroke="var(--line)" />
    <circle cx="44" cy={y + 18} r="7" fill={c} />
    <rect x="60" y={y + 13} width="90" height="10" rx="3" fill="var(--line)" />
    <rect x="222" y={y + 10} width="62" height="16" rx="8" fill={c} />
    <text x="253" y={y + 21.5} fill="#fff" textAnchor="middle">{l}</text>
  </g>
);

const Check = ({ y, done, l, w }: { y: number; done: boolean; l: string; w: number }) => (
  <g>
    <circle cx="40" cy={y + 14} r="9" fill={done ? "var(--brand)" : "none"} stroke={done ? "var(--brand)" : "var(--amber)"} strokeWidth="2" />
    {done && <path d={`M35 ${y + 14}l4 4 7-8`} stroke="#fff" strokeWidth="2" fill="none" />}
    <rect x="58" y={y + 9} width={w} height="10" rx="3" fill="var(--line)" />
    <text x="296" y={y + 18} textAnchor="end" fill="var(--mute)">{l}</text>
  </g>
);

const Suppliers = () => (
  <Svg label="Supplier panel with verification status">
    <Row y={12} o={1} c="var(--brand)" l="Verified" />
    <Row y={56} o={1} c="var(--amber)" l="In review" />
    <Row y={100} o={0.4} c="var(--amber)" l="Sample order" />
  </Svg>
);

const Cost = () => (
  <Svg label="Landed cost breakdown">
    <text x="24" y="30" fill="var(--mute)">Estimated landed cost</text>
    <rect x="24" y="44" width="120" height="30" rx="4" fill="var(--ink)" />
    <rect x="146" y="44" width="50" height="30" fill="var(--brand)" />
    <rect x="198" y="44" width="14" height="30" fill="var(--amber)" />
    <rect x="214" y="44" width="42" height="30" fill="var(--brick)" />
    <rect x="258" y="44" width="38" height="30" rx="4" fill="#8c8579" />
    <g fill="var(--mute)"><text x="24" y="96">Product</text><text x="146" y="96">Freight</text><text x="214" y="96">Duty</text><text x="258" y="96">Other</text></g>
    <text x="24" y="126" fill="var(--ink)" fontWeight="600">Shown before you pay</text>
  </Svg>
);

const Compliance = () => (
  <Svg label="Compliance checklist">
    <Check y={10} done l="HS code" w={110} />
    <Check y={48} done l="Permit" w={96} />
    <Check y={86} done={false} l="Release on hold" w={84} />
  </Svg>
);

const Payment = () => (
  <Svg label="Payment milestones">
    <text x="160" y="30" textAnchor="middle" fill="var(--mute)">Held by a licensed partner</text>
    <line x1="40" y1="70" x2="280" y2="70" stroke="var(--line)" strokeWidth="3" />
    <line x1="40" y1="70" x2="160" y2="70" stroke="var(--brand)" strokeWidth="3" />
    {[40, 100, 160].map((x) => <circle key={x} cx={x} cy="70" r="7" fill="var(--brand)" />)}
    <circle cx="220" cy="70" r="7" fill="var(--card)" stroke="var(--amber)" strokeWidth="3" />
    <circle cx="280" cy="70" r="7" fill="var(--card)" stroke="var(--line)" strokeWidth="3" />
    <g fill="var(--mute)" textAnchor="middle" fontSize="10">
      {["Deposit", "Production", "Inspection", "Shipment", "Delivery"].map((t, i) => <text key={t} x={40 + i * 60} y="100">{t}</text>)}
    </g>
  </Svg>
);

const Freight = () => (
  <Svg label="Freight route from supplier to doorstep">
    <path className="arc" d="M30 105 C110 30 210 130 290 50" fill="none" stroke="var(--brand)" strokeWidth="2.5" />
    <circle cx="30" cy="105" r="7" fill="var(--ink)" />
    <circle cx="290" cy="50" r="7" fill="var(--amber)" />
    <rect x="146" y="58" width="28" height="20" rx="3" fill="var(--card)" stroke="var(--ink)" strokeWidth="2" />
    <g fill="var(--mute)" textAnchor="middle"><text x="30" y="130">Supplier</text><text x="290" y="34">Doorstep</text></g>
  </Svg>
);

const Record = () => (
  <Svg label="Supplier performance record improving">
    <text x="24" y="26" fill="var(--mute)">Supplier performance record</text>
    {[20, 32, 28, 48, 60, 76].map((h, i) => (
      <rect key={i} x={40 + i * 42} y={130 - h} width="26" height={h} rx="3" fill={i === 5 ? "var(--amber)" : "var(--brand)"} />
    ))}
  </Svg>
);

export const visuals = { suppliers: Suppliers, cost: Cost, compliance: Compliance, payment: Payment, freight: Freight, record: Record };
export type VisualKey = keyof typeof visuals;

export function Visual({ name }: { name: VisualKey }) {
  const V = visuals[name];
  return (
    <div className="border-t border-line bg-paper py-2.5 [background-image:radial-gradient(var(--line)_1px,transparent_1px)] [background-size:14px_14px]">
      <V />
    </div>
  );
}

const nodes: [number, number, string][] = [
  [90, 150, "Supplier"], [320, 79, "Inspection and freight"], [550, 55, "Customs clearance"],
  [780, 79, "Inland delivery"], [1010, 150, "Your doorstep"],
];

const regions: Record<number, string> = { 0: "China", 4: "Zimbabwe" };
const stopDot = (i: number) =>
  i === 0 ? "border-ink bg-ink" : i === nodes.length - 1 ? "border-amber bg-amber" : "border-brand bg-card";

export function Corridor() {
  return (
    <>
      {/* Wide screens: the arc. Its 13px labels shrink to about 4px on a phone, so it is hidden there. */}
      <svg viewBox="0 0 1100 200" role="img" aria-label="Route from supplier in China to doorstep in Zimbabwe" className="mb-7 hidden h-auto w-full md:block" fontFamily="var(--font-hanken)">
        <path d="M90 150 Q550 -40 1010 150" fill="none" stroke="var(--line)" strokeWidth="3" />
        <path className="arc" d="M90 150 Q550 -40 1010 150" fill="none" stroke="var(--brand)" strokeWidth="3" />
        {nodes.map(([x, y, t], i) => (
          <g key={t}>
            <circle cx={x} cy={y} r={i % 4 ? 8 : 11} fill={i === 4 ? "var(--amber)" : i === 0 ? "var(--ink)" : "var(--card)"} stroke={i % 4 ? "var(--brand)" : "none"} strokeWidth="3" />
            <text x={x} y={y + 32} textAnchor="middle" fontSize="13" fill="var(--mute)">{t}</text>
          </g>
        ))}
        <text x="90" y="108" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)">China</text>
        <text x="1010" y="108" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)">Zimbabwe</text>
      </svg>

      {/* Phones: the same five stops as a vertical route. */}
      <ol aria-label="Route from supplier in China to doorstep in Zimbabwe" className="mb-7 rounded-lg border border-line bg-card p-5 md:hidden">
        {nodes.map(([, , t], i) => (
          <li key={t} className="relative flex gap-4 pb-6 last:pb-0">
            {i < nodes.length - 1 && <span aria-hidden="true" className="absolute left-[7px] top-5 h-full border-l-2 border-dashed border-brand/60" />}
            <span aria-hidden="true" className={`relative mt-0.5 size-4 shrink-0 rounded-full border-2 ${stopDot(i)}`} />
            <div className="leading-tight">
              {regions[i] && <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-ink">{regions[i]}</p>}
              <p className="text-[15px] text-mute">{t}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
