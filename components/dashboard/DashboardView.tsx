import Link from "next/link";
import type { Buyer, DashboardData, LandedRow, TxRow } from "@/lib/dashboard/queries";
import {
  formatDate,
  formatUsd,
  greeting,
  isFinished,
  isShipmentState,
  journey,
  routeProgress,
  shortRef,
  stateLabel,
  stateTone,
  stepStatuses,
  currentStep,
  type StepStatus,
} from "@/lib/dashboard/journey";
import { Stepper, TradeLane } from "./Journey";
import { ProductCard } from "./ProductCard";
import { SpendChart, type SpendMonth } from "./SpendChart";
import { Card, CardHeader, EmptyNote, Eyebrow, PageHeading, Pill } from "./ui";

type Props = { buyer: Buyer; kycDone: boolean; data: DashboardData; now?: Date };

// ---- derivations -----------------------------------------------------------

function monthlySpend(transactions: TxRow[], now: Date): SpendMonth[] {
  const months: SpendMonth[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const label = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const value = transactions
      .filter((t) => t.state !== "refunded")
      .filter((t) => {
        const c = new Date(t.created_at);
        return `${c.getUTCFullYear()}-${c.getUTCMonth()}` === key;
      })
      .reduce((sum, t) => sum + t.total_value_usd, 0);
    months.push({ label, value });
  }
  return months;
}

type Action = { title: string; meta: string; tone: "wait" | "bad" };

function buildActions(buyer: Buyer, kycDone: boolean, data: DashboardData): Action[] {
  const actions: Action[] = [];
  if (!kycDone) {
    actions.push({
      title: "Complete business verification",
      meta: "Needed before funds can be placed in protected payment.",
      tone: "wait",
    });
  }
  for (const r of data.rfqs.filter((r) => r.status === "quoted")) {
    actions.push({
      title: `Review your quote${r.categories ? ` for ${r.categories.name}` : ""}`,
      meta: `Requested ${formatDate(r.created_at)}.`,
      tone: "wait",
    });
  }
  for (const t of data.transactions.filter((t) => t.state === "disputed")) {
    actions.push({
      title: `Dispute open on ${shortRef(t.id)}`,
      meta: `${t.suppliers?.name ?? "Supplier"} · ${t.categories?.name ?? "Order"}`,
      tone: "bad",
    });
  }
  void buyer;
  return actions;
}

const landedParts: { key: keyof LandedRow; label: string; bar: string }[] = [
  { key: "product_cost", label: "Product", bar: "bg-ink" },
  { key: "freight_cost", label: "Freight", bar: "bg-brand" },
  { key: "duty_estimate", label: "Duties and taxes (estimate)", bar: "bg-amber" },
  { key: "delivery_cost", label: "Inland delivery", bar: "bg-mute" },
  { key: "clearing_cost", label: "Clearing", bar: "bg-brand/50" },
  { key: "insurance_cost", label: "Insurance", bar: "bg-ink/50" },
  { key: "platform_fee", label: "Nexum fee", bar: "bg-amber/50" },
];

function releaseConditions(t: TxRow) {
  const cur = currentStep(t.state, t.previous_state);
  const idx = (key: string) => journey.findIndex((s) => s.key === key);
  const past = (key: string) => cur > idx(key) || isFinished(t.state);
  return [
    { label: "Quote accepted", done: true },
    { label: "Business verified", done: past("kyc") },
    { label: "Funds in protected payment", done: t.funds_status === "held" || t.funds_status === "released" || past("funds") },
    t.compliance_required
      ? { label: "Permit or licence decision", done: past("compliance") || t.state === "compliance_cleared" }
      : { label: "No permit case opened for this order", done: true },
    { label: "Supplier released", done: past("release") },
  ];
}

function laneNodes(t: TxRow) {
  const cur = currentStep(t.state, t.previous_state);
  const delivered = t.state === "delivered" || t.state === "closed";
  const st = (done: boolean, now: boolean): StepStatus => (done ? "done" : now ? "now" : "todo");
  return [
    { title: "Supplier", sub: t.suppliers?.name ?? "Approved supplier", meta: cur >= 5 ? "Released and dispatched" : "Preparing release", status: st(cur >= 5, cur < 5), icon: "M4 21V8l8-5 8 5v13M9 21v-6h6v6" },
    { title: "Freight", sub: "Sea or air, insured", meta: cur >= 6 ? "Arrived" : cur === 5 ? "Moving" : "Not started", status: st(cur >= 6, cur === 5), icon: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
    { title: "Customs", sub: "Registered clearing agent", meta: delivered || cur >= 7 ? "Cleared" : cur === 6 ? "Clearing" : "Not started", status: st(delivered || cur >= 7, cur === 6), icon: "M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 14l2 2 4-4" },
    { title: "Doorstep", sub: "Your address", meta: delivered ? "Delivered" : "Not started", status: st(delivered, false), icon: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
  ];
}

// ---- view --------------------------------------------------------------------

export function DashboardView({ buyer, kycDone, data, now = new Date() }: Props) {
  const { transactions, products } = data;
  const name = buyer.business_name ?? buyer.email?.split("@")[0] ?? "there";
  const active = transactions.filter((t) => !isFinished(t.state));
  const featured = active[0];
  const fundsHeld = transactions.filter((t) => t.funds_status === "held").reduce((s, t) => s + t.total_value_usd, 0);
  const compliancePending = transactions.filter((t) => t.state === "compliance_pending");
  const complianceOrders = transactions.filter((t) => t.compliance_required);
  const shipments = transactions.filter((t) => isShipmentState(t.state) && t.state !== "delivered");
  const actions = buildActions(buyer, kycDone, data);

  const kpis = [
    { label: "Active transactions", value: String(active.length), sub: active.length === 1 ? "1 order in progress" : `${active.length} orders in progress` },
    { label: "In protected payment", value: formatUsd(fundsHeld), sub: "Held until release conditions are met" },
    { label: "Compliance pending", value: String(compliancePending.length), sub: "Awaiting a permit decision" },
    { label: "Shipments on the way", value: String(shipments.length), sub: "Released, in transit or at customs" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Command center"
        title={`${greeting(now)}, ${name}`}
        lede={
          actions.length > 0
            ? `${actions.length} ${actions.length === 1 ? "item needs" : "items need"} your attention. Every order is one auditable journey, from supplier check to your doorstep.`
            : "Every order is one auditable journey, from supplier check to your doorstep."
        }
        action={
          <Link href="/dashboard/catalogue" className="rounded-md border border-brand bg-brand px-4.5 py-2.5 text-[15px] font-semibold text-white">
            Browse the catalogue
          </Link>
        }
      />

      {/* Actions + KPIs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Needs your action" />
          {actions.length === 0 ? (
            <EmptyNote>Nothing needs your action right now.</EmptyNote>
          ) : (
            <ul className="divide-y divide-line">
              {actions.map((a) => (
                <li key={a.title} className="flex items-start gap-3 py-3 first:pt-0">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${a.tone === "bad" ? "bg-brick" : "bg-amber"}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-[13px] text-mute">{a.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-4">
          {kpis.map((k) => (
            <Card key={k.label} className="flex min-w-0 flex-col gap-1 p-4">
              <p className="text-[13px] font-medium text-mute">{k.label}</p>
              <p className="font-serif text-3xl font-semibold leading-none">{k.value}</p>
              <p className="text-[13px] text-mute">{k.sub}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Active transaction */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="text-xl">Active transaction</h2>
          {featured && <Pill tone={stateTone(featured.state)}>{stateLabel[featured.state]}</Pill>}
        </div>

        {!featured ? (
          <div className="p-6">
            <EmptyNote>
              No active orders yet. Pick a product in the catalogue and request a landed quote to start one.
            </EmptyNote>
          </div>
        ) : (
          <>
            <dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Transaction", shortRef(featured.id)],
                ["Category", featured.categories?.name ?? "Not set"],
                ["Supplier", featured.suppliers?.name ?? "Approved supplier"],
                ["Order value", formatUsd(featured.total_value_usd)],
                ["Promised delivery", featured.promised_delivery_date ? formatDate(featured.promised_delivery_date) : "Set once funded"],
                ["Created", formatDate(featured.created_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[13px] text-mute">{k}</dt>
                  <dd className="text-[15px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-line px-6 py-5">
              <Stepper
                steps={stepStatuses(featured.state, featured.previous_state).map((status, i) => ({
                  label: journey[i].label,
                  status,
                  note: status === "now" ? stateLabel[featured.state] : undefined,
                }))}
              />
            </div>

            <div className="grid gap-8 border-t border-line p-6 lg:grid-cols-2">
              <div>
                <h3 className="text-lg">Release conditions</h3>
                <p className="mt-1 text-[14px] text-mute">
                  The supplier is only released once every condition below is met.
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {releaseConditions(featured).map((c) => (
                    <li key={c.label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${c.done ? "bg-brand/10" : "border border-line"}`}>
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${c.done ? "border-brand bg-brand text-paper" : "border-amber"}`}>
                        {c.done && (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12l5 5 9-10" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 font-medium">{c.label}</span>
                      <span className="text-xs font-semibold text-mute">{c.done ? "Done" : "Open"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <LandedCost landed={data.landed} />
            </div>
          </>
        )}
      </Card>

      {/* Trade lane */}
      {featured && (
        <section aria-labelledby="lane-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="lane-heading" className="text-xl">Trade lane</h2>
            <p className="text-[14px] text-mute">{shortRef(featured.id)} · China to Zimbabwe</p>
          </div>
          <TradeLane nodes={laneNodes(featured)} />
        </section>
      )}

      {/* Spend + shipments + compliance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <CardHeader title="Order value by month" />
          <SpendChart months={monthlySpend(transactions, now)} />
        </Card>

        <Card className="p-5">
          <CardHeader title="Shipments" href="/dashboard/shipments" linkLabel="Track all" />
          {shipments.length === 0 ? (
            <EmptyNote>Nothing is on the way yet.</EmptyNote>
          ) : (
            <ul className="divide-y divide-line">
              {shipments.slice(0, 3).map((t) => (
                <li key={t.id} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate font-semibold">{t.categories?.name ?? "Order"} · {t.suppliers?.name ?? "Supplier"}</p>
                    <Pill tone={stateTone(t.state)}>{stateLabel[t.state]}</Pill>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={`${Math.round(routeProgress(t.state, t.previous_state) * 100)} percent of the route`}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, routeProgress(t.state, t.previous_state) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <CardHeader title="Compliance" />
          {complianceOrders.length === 0 ? (
            <EmptyNote>None of your orders have needed a permit case.</EmptyNote>
          ) : (
            <ul className="divide-y divide-line">
              {complianceOrders.slice(0, 4).map((t) => {
                const decided = t.state !== "compliance_pending" && currentStep(t.state, t.previous_state) >= journey.findIndex((s) => s.key === "compliance");
                const reached = currentStep(t.state, t.previous_state) >= journey.findIndex((s) => s.key === "compliance");
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{t.categories?.name ?? "Order"}</p>
                      <p className="text-[13px] text-mute">{shortRef(t.id)}</p>
                    </div>
                    <Pill tone={decided ? "ok" : reached ? "wait" : "idle"}>
                      {decided ? "Cleared" : reached ? "Awaiting decision" : "Not started"}
                    </Pill>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-[13px] text-mute">
            Nexum prepares and tracks applications. Permits are only approved by the competent authority.
          </p>
        </Card>
      </div>

      {/* Catalogue strip */}
      <section aria-labelledby="strip-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="strip-heading" className="text-2xl">From the catalogue</h2>
          <Link href="/dashboard/catalogue" className="rounded-md border border-ink px-3.5 py-2 text-[13px] font-semibold">
            Browse all products
          </Link>
        </div>
        {products.length === 0 ? (
          <EmptyNote>Products from approved suppliers will appear here as they are published.</EmptyNote>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} compact index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Documents + trade visit */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardHeader title="Document vault" />
          {data.documents.length === 0 ? (
            <EmptyNote>No documents yet. Invoices, packing lists and permits will be filed here.</EmptyNote>
          ) : (
            <ul className="divide-y divide-line">
              {data.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-mute">
                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" />
                  </svg>
                  <span className="flex-1 font-semibold capitalize">{d.doc_type.replaceAll("_", " ")}</span>
                  <span className="text-[13px] text-mute">{formatDate(d.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <section className="flex flex-col gap-3 rounded-xl bg-ink p-6 text-paper">
          <Eyebrow><span className="text-paper/70">Trade visit</span></Eyebrow>
          <h2 className="text-2xl">Prefer to see it yourself?</h2>
          <p className="text-paper/80">
            Plan a sourcing trip to verified factories, with inspection and interpreter support, on the same record as your orders.
          </p>
          {data.plannedTrips > 0 && (
            <p className="text-sm font-semibold">
              You have {data.plannedTrips} {data.plannedTrips === 1 ? "trip" : "trips"} planned or confirmed.
            </p>
          )}
          <Link href="/trade-visit" className="mt-1 self-start rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink">
            How Trade Visits work
          </Link>
        </section>
      </div>

      {buyer.kyc_status === "rejected" && (
        <p className="text-sm text-brick dark:text-amber">Your business verification needs attention. Our team will be in touch.</p>
      )}
    </div>
  );
}

function LandedCost({ landed }: { landed: LandedRow | null }) {
  if (!landed) {
    return (
      <div>
        <h3 className="text-lg">Estimated landed cost</h3>
        <div className="mt-3">
          <EmptyNote>No landed-cost estimate on file for this order yet.</EmptyNote>
        </div>
      </div>
    );
  }
  const parts = landedParts.map((p) => ({ ...p, value: landed[p.key] })).filter((p) => p.value > 0);
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg">Estimated landed cost</h3>
        <p className="font-serif text-2xl font-semibold">{formatUsd(total)}</p>
      </div>
      <div className="mt-3 flex h-3.5 gap-0.5 overflow-hidden rounded" role="img" aria-label={`Landed cost split into ${parts.map((p) => p.label).join(", ")}`}>
        {parts.map((p) => (
          <div key={p.key} className={p.bar} style={{ flex: `${p.value} 1 0`, minWidth: 6 }} />
        ))}
      </div>
      <ul className="mt-2">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2.5 border-t border-line py-1.5 first:border-t-0">
            <span className={`size-2.5 shrink-0 rounded-sm ${p.bar}`} aria-hidden="true" />
            <span className="flex-1">{p.label}</span>
            <span className="tabular-nums text-mute">{formatUsd(p.value)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[13px] text-mute">
        Estimate only. Official duty and taxes are assessed by ZIMRA at clearance.
      </p>
    </div>
  );
}
