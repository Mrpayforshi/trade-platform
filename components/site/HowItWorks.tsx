"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

// The homepage explainer. Six steps, taken from how an order really moves through Nexum
// (search, compare, landed-cost quote, verify and pay, compliance and release, ship and
// track), with the professionals who work behind each step lit up underneath.
// Everything on screen is illustrative: no real prices, suppliers or partners.

type PartyId =
  | "suppliers"
  | "checks"
  | "tariff"
  | "ops"
  | "freight"
  | "inspection"
  | "payment"
  | "clearing"
  | "authorities"
  | "inland";

const PARTIES: { id: PartyId; label: string }[] = [
  { id: "suppliers", label: "Approved suppliers in China" },
  { id: "checks", label: "Nexum supplier checks" },
  { id: "tariff", label: "Tariff and permit review" },
  { id: "ops", label: "Nexum operations team" },
  { id: "freight", label: "Freight and shipping partners" },
  { id: "inspection", label: "Inspection partners" },
  { id: "payment", label: "Payment partner" },
  { id: "clearing", label: "Registered clearing agents" },
  { id: "authorities", label: "Customs and permit authorities" },
  { id: "inland", label: "Inland transport" },
];

const tab = "rounded-md border px-2.5 py-1 text-xs font-semibold";
const bar = "h-2.5 rounded-sm bg-line";

function ScreenFrame({ title, tag = "Illustrative", children }: { title: string; tag?: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[13px] text-mute">
        <b className="text-ink">{title}</b>
        <span>{tag}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SearchScreen() {
  return (
    <ScreenFrame title="Your list">
      <ul className="space-y-1.5 text-[17px]">
        <li>100 solar panels</li>
        <li>5 tipper trucks</li>
        <li>3 irrigation systems</li>
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-mute">One item per line, with quantities</span>
        <span className="rounded-md border border-brand bg-brand px-3.5 py-2 text-sm font-semibold text-white">Find suppliers</span>
      </div>
    </ScreenFrame>
  );
}

function CompareScreen() {
  const rows: [string, string][] = [
    ["Highest trust score", "bg-brand/10 text-brand"],
    ["Lowest price", "bg-amber/20 text-ink"],
    ["Fastest lead time", "bg-line text-ink"],
  ];
  return (
    <ScreenFrame title="Compare by">
      <div className="flex flex-wrap gap-2">
        <span className={`${tab} border-line`}>Best match</span>
        <span className={`${tab} border-ink bg-ink text-paper`}>Highest quality</span>
        <span className={`${tab} border-line`}>Lowest price</span>
        <span className={`${tab} border-line`}>Fastest lead time</span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map(([label, tone], i) => (
          <li key={label} className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">{i + 1}</span>
            <span className={`${bar} w-24 sm:w-32`} />
            <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
          </li>
        ))}
      </ul>
    </ScreenFrame>
  );
}

function QuoteScreen() {
  const parts: [string, string, string][] = [
    ["Product", "bg-ink", "w-[34%]"],
    ["Freight", "bg-brand", "w-[16%]"],
    ["Insurance", "bg-amber", "w-[6%]"],
    ["Duty", "bg-brick", "w-[20%]"],
    ["Clearing", "bg-[#8c8579]", "w-[10%]"],
    ["Delivery", "bg-line", "w-[14%]"],
  ];
  return (
    <ScreenFrame title="Landed-cost estimate" tag="Illustrative, not real figures">
      <div className="flex h-8 overflow-hidden rounded-md">
        {parts.map(([name, bg, w]) => (
          <span key={name} className={`${bg} ${w}`} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-mute sm:grid-cols-3">
        {parts.map(([name, bg]) => (
          <li key={name} className="flex items-center gap-2">
            <span className={`size-3 rounded-sm ${bg}`} />
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold">Shown before you pay</p>
    </ScreenFrame>
  );
}

const dot = { done: "border-brand bg-brand", now: "border-amber bg-amber", next: "border-mute bg-transparent" };

function ChecklistScreen({ title, items }: { title: string; items: [string, keyof typeof dot][] }) {
  return (
    <ScreenFrame title={title}>
      <ul className="space-y-2.5">
        {items.map(([label, state]) => (
          <li key={label} className="flex items-center gap-3 text-[15px]">
            <span className={`size-3.5 shrink-0 rounded-full border-2 ${dot[state]}`} />
            <span className={state === "next" ? "text-mute" : ""}>{label}</span>
          </li>
        ))}
      </ul>
    </ScreenFrame>
  );
}

function TrackScreen() {
  const stops: [string, keyof typeof dot][] = [
    ["Dispatched", "done"],
    ["In transit", "now"],
    ["At customs", "next"],
    ["Delivered", "next"],
  ];
  return (
    <ScreenFrame title="Track your order">
      <ol className="grid grid-cols-4 gap-2 text-center text-xs text-mute sm:text-[13px]">
        {stops.map(([label, state], i) => (
          <li key={label} className="relative flex flex-col items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className={`absolute right-1/2 top-[7px] h-0.5 w-full ${state === "next" ? "bg-line" : "bg-brand"}`} />
            )}
            <span className={`relative size-4 rounded-full border-2 ${dot[state]}`} />
            <span className={state === "now" ? "font-semibold text-ink" : ""}>{label}</span>
          </li>
        ))}
      </ol>
    </ScreenFrame>
  );
}

type Step = {
  title: string;
  you: string;
  behind: string;
  parties: PartyId[];
  screen: ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Search your whole list",
    you: "Write what you need, one item per line, with quantities. Or browse the categories and tap items to add them to your list.",
    behind:
      "Every supplier you see has passed Nexum's admission checks: business identity, factory or site, product and certification review, export documents and bank account. Only a limited number are admitted per category.",
    parties: ["suppliers", "checks"],
    screen: <SearchScreen />,
  },
  {
    title: "Compare the way you want",
    you: "Rank the options by what matters for this order: Best match, Highest quality, Lowest price or Fastest lead time. Signed-in buyers can also group everything by supplier.",
    behind:
      "Trust scores come from each supplier's delivery record, such as on-time release, product conformity, inspections and disputes. Ranking is based on performance, never payment.",
    parties: ["suppliers", "checks"],
    screen: <CompareScreen />,
  },
  {
    title: "Get your landed-cost quote",
    you: "Pick a supplier and a quantity and request a quote. You see one estimate for the whole trip: product, freight, insurance, duty, clearing and delivery to Zimbabwe.",
    behind:
      "Our operations team prices the journey with freight partners and clearing agents, and the product's tariff classification is reviewed. Duty figures are estimates until officially assessed.",
    parties: ["ops", "tariff", "freight", "clearing"],
    screen: <QuoteScreen />,
  },
  {
    title: "Accept, verify and pay",
    you: "Accept the quote, complete buyer verification and pay. Your payment is held under agreed release conditions instead of going straight to the supplier.",
    behind:
      "Funds move through a payment partner rather than Nexum's own operating account, and the supplier is paid only when the agreed conditions are met.",
    parties: ["payment", "ops"],
    screen: (
      <ChecklistScreen
        title="Your order"
        items={[
          ["Quote accepted", "done"],
          ["Buyer verified", "done"],
          ["Funds protected", "now"],
          ["Supplier released", "next"],
        ]}
      />
    ),
  },
  {
    title: "Permits cleared, supplier released",
    you: "We work out the import route and the permits and documents your product needs. The supplier is released only when payment and permit conditions are met.",
    behind:
      "Government authorities issue permits and licences, and the customs authority assesses duty. Registered clearing agents file the entries. Nexum prepares applications and tracks status. We never issue permits ourselves.",
    parties: ["tariff", "authorities", "clearing", "ops"],
    screen: (
      <ChecklistScreen
        title="Compliance case"
        items={[
          ["Tariff code reviewed", "done"],
          ["Permits and licences identified", "done"],
          ["Customs documents prepared", "now"],
          ["Release to supplier", "next"],
        ]}
      />
    ),
  },
  {
    title: "Ship, clear and track",
    you: "Follow your order from dispatch through transit and customs to your door. Proof of delivery closes the order.",
    behind:
      "Inspection options, insurance and freight run while a clearing agent prepares customs entry, and inland transport brings the goods to you. Every delivery adds to the supplier's performance record.",
    parties: ["inspection", "freight", "clearing", "authorities", "inland"],
    screen: <TrackScreen />,
  },
];

const AUTOPLAY_MS = 7000;
const reducedQuery = "(prefers-reduced-motion: no-preference)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function Detail({ step }: { step: Step }) {
  return (
    <div>
      <p className="text-lg leading-snug">{step.you}</p>
      <div aria-hidden="true" className="mt-5">{step.screen}</div>
      <div className="mt-5 rounded-lg border border-line bg-paper p-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">Behind the scenes</p>
        <p className="mt-1.5 text-[15px] text-mute">{step.behind}</p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const motionOk = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );
  const autoplay = motionOk && playing;

  useEffect(() => {
    if (!autoplay) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay]);

  function choose(i: number) {
    setActive(i);
    setPlaying(false);
  }

  const current = STEPS[active];

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-line py-12 md:py-18">
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-brand">How Nexum works</p>
      <h2 id="how-heading" className="mb-3 mt-2 text-[clamp(28px,4vw,40px)] tracking-tight">
        Six steps from your list to your door.
        <br />
        <span className="text-mute">A network of professionals behind each one.</span>
      </h2>
      <p className="max-w-[60ch] text-lg text-mute">
        You deal with one simple flow. Suppliers, inspectors, freight partners, a payment partner, clearing agents and the
        authorities do the rest, in the right order.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-10">
        <div>
          <ol className="grid gap-2">
            {STEPS.map((s, i) => {
              const on = i === active;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    aria-expanded={on}
                    onClick={() => choose(i)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                      on ? "border-ink bg-card" : "border-line hover:border-ink"
                    }`}
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        on ? "bg-ink text-paper" : "bg-line text-ink"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[17px] ${on ? "font-semibold" : "font-medium"}`}>{s.title}</span>
                  </button>
                  {/* Phones: the detail opens under its step, so there is no long scroll back up. */}
                  {on && (
                    <div className="mt-2 rounded-lg border border-line bg-card p-4 md:hidden">
                      <Detail step={s} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {motionOk && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-2"
            >
              {playing ? "Pause the tour" : "Play the tour"}
            </button>
          )}
        </div>

        <div className="hidden rounded-xl border border-line bg-card p-6 md:block md:min-h-[34rem]" aria-live="off">
          <p className="mb-3 text-sm font-semibold text-mute">
            Step {active + 1} of {STEPS.length}
          </p>
          <h3 className="mb-3 text-2xl">{current.title}</h3>
          <Detail step={current} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-card p-5 md:p-6">
        <p className="text-sm font-semibold">The network behind every order</p>
        <p className="mt-1 text-sm text-mute">Highlighted: who is working on the step you are viewing.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {PARTIES.map((p) => {
            const on = current.parties.includes(p.id);
            return (
              <li
                key={p.id}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on ? "border-brand bg-brand font-semibold text-white" : "border-line text-mute"
                }`}
              >
                {p.label}
                {on && <span className="sr-only"> (working on this step)</span>}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 max-w-190 text-[13px] text-mute">
        Illustrative flow. Screens show sample content, not real prices or suppliers. Partners and timings are confirmed as
        operations go live.
      </p>
    </section>
  );
}
