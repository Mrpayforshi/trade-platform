import Link from "next/link";
import { EmptyNote } from "@/components/dashboard/ui";
import { btnPrimary } from "@/components/site/ui";
import { formatUsd, formatUsdPrecise, warrantyLabel } from "@/lib/dashboard/journey";
import {
  exceedsQuantity,
  groupBySupplier,
  lineTotal,
  rank,
  VIEW_LABELS,
  VIEW_ORDER,
  type Lens,
  type LineResult,
  type Match,
  type SupplierGroup,
  type View,
} from "@/lib/order/match";
import type { ListLine } from "@/lib/order/parse-list";
import { QuoteRequestButton, type QuoteRequest } from "./QuoteRequestButton";

// Signed out: the first item opens in full (top 3), supplier names are hidden, the other
// items are locked, and there is no by-supplier view or quote button. Signed in: every
// item opens (top 6), names show, and quotes can be requested. The page decides `member`
// on the server, and the hidden details are never rendered, only withheld.

const PREVIEW_OFFERS = 3;
const MEMBER_OFFERS = 6;

const th = "px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-mute";

function queryFor(list: string, view: View) {
  const params = new URLSearchParams({ list });
  if (view !== "match") params.set("by", view);
  return params.toString();
}

function LockIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function supplierLabels(results: LineResult[]) {
  const labels = new Map<string, string>();
  for (const r of results) {
    for (const m of r.matches) {
      const id = m.product.supplier_id;
      if (!labels.has(id)) {
        const i = labels.size;
        labels.set(id, i < 26 ? `Supplier ${String.fromCharCode(65 + i)}` : `Supplier ${i + 1}`);
      }
    }
  }
  return labels;
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-mute">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold">
        <span className={warn ? "text-brick dark:text-amber" : undefined}>{value}</span>
        {warn && <span className="block text-[13px] font-medium text-brick dark:text-amber">{warn}</span>}
      </dd>
    </div>
  );
}

function specFor(line: ListLine, productName: string, supplierName: string, unit: string) {
  const qty = line.quantity == null ? "Quantity not stated." : `Quantity ${line.quantity} ${unit}.`;
  return `${line.term}: ${productName} from ${supplierName}. ${qty}`;
}

function OfferRow({
  position,
  match,
  line,
  member,
  label,
}: {
  position: number;
  match: Match;
  line: ListLine;
  member: boolean;
  label: string;
}) {
  const p = match.product;
  const total = lineTotal(p, line.quantity);
  const over = exceedsQuantity(p, line.quantity);
  const warranty = warrantyLabel(p.warranty_months);

  return (
    <li className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-line bg-card p-5">
      <div className="min-w-0 flex-[1_1_200px]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
            {position}
          </span>
          <p className="truncate font-serif text-xl font-semibold">{member ? p.supplier.name : label}</p>
        </div>
        <p className="mt-1.5 text-sm text-mute">{p.supplier.country ?? "China"} · Approved supplier</p>
        {!member && <p className="mt-1 text-[13px] text-mute">Name shown after you sign in</p>}
        <p className="mt-2 text-[15px]">{p.name}</p>
      </div>

      <dl className="flex flex-[2_1_380px] flex-wrap gap-x-7 gap-y-3">
        <Metric label="Trust score" value={p.supplier.score == null ? "New" : `${Math.round(p.supplier.score)} / 100`} />
        <Metric label="Lead time" value={p.lead_time_days == null ? "On request" : `${p.lead_time_days} days`} />
        <Metric label="Warranty" value={warranty ?? "Not stated"} />
        <Metric
          label="Minimum order"
          value={`${p.moq} ${p.unit}`}
          warn={over ? `Above your ${line.quantity}` : undefined}
        />
      </dl>

      <div className="text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mute">
          {line.quantity == null ? "Supplier price" : `Supplier price, ${line.quantity} ${p.unit}`}
        </p>
        <p className="mt-0.5 font-serif text-2xl font-semibold">
          {total == null ? formatUsdPrecise(p.unit_price_usd) : formatUsd(total)}
        </p>
        <p className="text-sm text-mute">
          {formatUsdPrecise(p.unit_price_usd)} / {p.unit}
        </p>
        {member && (
          <div className="ml-auto mt-3 w-48">
            <QuoteRequestButton
              label="Request landed quote"
              requests={[
                {
                  category_id: p.category_id,
                  quantity: line.quantity,
                  specification: specFor(line, p.name, p.supplier.name, p.unit),
                },
              ]}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function LineSection({
  result,
  lens,
  member,
  labels,
}: {
  result: LineResult;
  lens: Lens;
  member: boolean;
  labels: Map<string, string>;
}) {
  const { line, matches } = result;
  const limit = member ? MEMBER_OFFERS : PREVIEW_OFFERS;
  const shown = rank(matches, lens).slice(0, limit);

  return (
    <section aria-label={line.term} className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b-[3px] border-ink pb-3">
        <h3 className="text-2xl first-letter:uppercase">
          {line.term}
          {line.quantity != null && <span className="ml-2 text-xl font-medium text-mute">· {line.quantity} units</span>}
        </h3>
        {matches.length > 0 && (
          <span className="text-sm text-mute">
            Showing top {shown.length} of {matches.length} approved {matches.length === 1 ? "supplier" : "suppliers"}
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="mt-4">
          <EmptyNote>
            No approved supplier matches this yet. Try another wording, for example the product type rather than a brand.
          </EmptyNote>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {shown.map((m, i) => (
            <OfferRow
              key={m.product.id}
              position={i + 1}
              match={m}
              line={line}
              member={member}
              label={labels.get(m.product.supplier_id) ?? "Supplier"}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function LockedLine({ result }: { result: LineResult }) {
  const { line, matches } = result;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border border-dashed border-mute px-5 py-4.5 text-mute">
      <div className="flex items-center gap-3">
        <LockIcon />
        <p className="font-serif text-xl font-semibold text-ink">
          {line.term}
          {line.quantity != null && <span className="ml-2 text-[17px] font-medium text-mute">· {line.quantity} units</span>}
        </p>
      </div>
      <span className="text-sm">
        {matches.length > 0
          ? `${matches.length} ${matches.length === 1 ? "supplier" : "suppliers"} matched. Sign in to compare.`
          : "No match yet."}
      </span>
    </div>
  );
}

function SignupGate({ lockedCount, query }: { lockedCount: number; query: string }) {
  const loginHref = `/login?next=${encodeURIComponent(`/dashboard/start-order?${query}`)}`;
  return (
    <section aria-label="Create an account" className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 rounded-lg bg-ink p-8 text-paper">
      <div className="flex-[1_1_380px]">
        <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-amber">
          {lockedCount > 0 ? `${lockedCount} more ${lockedCount === 1 ? "item" : "items"} on your list` : "More suppliers for this item"}
        </p>
        <h3 className="mt-2 text-3xl leading-tight">See every match for every line.</h3>
        <p className="mt-2 text-base leading-relaxed opacity-85">
          A free account unlocks all suppliers and their names, the by-supplier view, and quote requests.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className={`${btnPrimary} min-h-11 text-base`}>
          Create free account
        </Link>
        <Link href={loginHref} className="inline-block min-h-11 rounded-md border border-paper px-4.5 py-2.5 text-base font-semibold">
          Log in
        </Link>
      </div>
    </section>
  );
}

function SupplierGroupCard({ group }: { group: SupplierGroup }) {
  const priced = group.items.filter((i) => lineTotal(i.product, i.line.quantity) != null);
  const subtotal = priced.reduce((sum, i) => sum + (lineTotal(i.product, i.line.quantity) ?? 0), 0);
  const partial = priced.length < group.items.length;
  const requests: QuoteRequest[] = group.items.map((i) => ({
    category_id: i.product.category_id,
    quantity: i.line.quantity,
    specification: specFor(i.line, i.product.name, group.supplier.name, i.product.unit),
  }));
  const n = group.items.length;

  return (
    <article className="overflow-hidden rounded-xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 border-b-[3px] border-ink px-6 py-5">
        <div>
          <h3 className="text-2xl">{group.supplier.name}</h3>
          <p className="mt-1 text-sm text-mute">
            {group.supplier.country ?? "China"} · Approved supplier ·{" "}
            {group.supplier.score == null ? "New to Nexum" : `Trust score ${Math.round(group.supplier.score)} / 100`}
          </p>
        </div>
        <span className="rounded-full border border-ink px-3.5 py-1.5 text-sm font-semibold">
          Covers {n} {n === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-170 border-collapse text-[15px]">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-mute">Item</th>
              <th scope="col" className={th}>Qty</th>
              <th scope="col" className={th}>Unit price</th>
              <th scope="col" className={th}>Supplier price</th>
              <th scope="col" className={th}>Lead time</th>
              <th scope="col" className={`${th} pr-6`}>Min. order</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((i) => {
              const total = lineTotal(i.product, i.line.quantity);
              const over = exceedsQuantity(i.product, i.line.quantity);
              return (
                <tr key={`${i.line.term}-${i.product.id}`} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-6 py-3.5 text-left font-semibold">
                    {i.product.name}
                    <span className="block text-[13px] font-normal text-mute">For: {i.line.term}</span>
                  </th>
                  <td className="px-3 py-3.5 text-right">{i.line.quantity ?? "Not stated"}</td>
                  <td className="px-3 py-3.5 text-right">{formatUsdPrecise(i.product.unit_price_usd)}</td>
                  <td className="px-3 py-3.5 text-right font-semibold">{total == null ? "n/a" : formatUsd(total)}</td>
                  <td className="px-3 py-3.5 text-right">
                    {i.product.lead_time_days == null ? "On request" : `${i.product.lead_time_days} days`}
                  </td>
                  <td className={`px-3 py-3.5 pr-6 text-right ${over ? "font-semibold text-brick dark:text-amber" : ""}`}>
                    {i.product.moq}
                    {over && <span className="block text-[13px] font-medium">Above your {i.line.quantity}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-6 py-4.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mute">Supplier subtotal</p>
          <p className="font-serif text-2xl font-semibold">{priced.length === 0 ? "n/a" : formatUsd(subtotal)}</p>
          {partial && priced.length > 0 && <p className="text-xs text-mute">Items with a quantity only</p>}
        </div>
        <div className="w-full sm:w-64">
          <QuoteRequestButton label={`Request quotes for ${n} ${n === 1 ? "item" : "items"}`} requests={requests} />
          <p className="mt-1 text-xs text-mute">One quote request is sent per item.</p>
        </div>
      </div>
    </article>
  );
}

export function ResultsView({
  results,
  view,
  list,
  member,
  basePath,
}: {
  results: LineResult[];
  view: View;
  list: string;
  member: boolean;
  basePath: string;
}) {
  const labels = supplierLabels(results);
  const lens: Lens = view === "supplier" ? "match" : view;
  const lockedFrom = member ? results.length : 1;
  const open = results.slice(0, lockedFrom);
  const locked = results.slice(lockedFrom);
  const hiddenOffers = !member && results.some((r, i) => i < lockedFrom && r.matches.length > PREVIEW_OFFERS);
  const showSupplierView = member && view === "supplier";
  const groups = showSupplierView ? groupBySupplier(results) : [];

  const chip = "inline-flex min-h-10 items-center rounded-full border border-ink bg-card px-3.5 text-[15px] font-medium";
  const tab = (active: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] ${
      active ? "border-ink bg-ink font-semibold text-paper" : "border-line bg-card font-medium hover:border-ink"
    }`;

  return (
    <div>
      <section aria-label="Your list">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="text-3xl md:text-4xl">Your list, matched</h2>
          <a href="#order-list" className="text-[15px] font-semibold underline underline-offset-2">
            Edit list
          </a>
        </div>
        <ul className="mt-4 flex flex-wrap gap-2.5">
          {results.map((r) => (
            <li key={`${r.line.term}-${r.line.quantity}`} className={chip}>
              {r.line.quantity != null && <strong className="mr-1.5 font-semibold">{r.line.quantity} ×</strong>}
              {r.line.term}
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Compare by" className="mt-8 border-t border-line pt-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="mr-1.5 text-sm font-semibold">Compare by</span>
          {VIEW_ORDER.map((v) => {
            if (v === "supplier" && !member) {
              return (
                <Link key={v} href="/signup" className={`${tab(false)} border-dashed text-mute`}>
                  <LockIcon />
                  {VIEW_LABELS[v]}
                </Link>
              );
            }
            return (
              <Link key={v} href={`${basePath}?${queryFor(list, v)}`} aria-current={view === v ? "page" : undefined} className={tab(view === v)}>
                {VIEW_LABELS[v]}
              </Link>
            );
          })}
        </div>
        <p className="mt-3.5 text-sm leading-relaxed text-mute">
          {showSupplierView
            ? "Grouped by supplier, each with the items on your list they can cover. Ranking is based on performance, never payment."
            : "Ranked on trust score, then price. Ranking is based on performance, never payment."}
        </p>
      </nav>

      {showSupplierView ? (
        groups.length === 0 ? (
          <div className="mt-8">
            <EmptyNote>No supplier matches your list yet.</EmptyNote>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-6">
            {groups.map((g) => (
              <SupplierGroupCard key={g.supplierId} group={g} />
            ))}
          </div>
        )
      ) : (
        <>
          {open.map((r) => (
            <LineSection key={`${r.line.term}-${r.line.quantity}`} result={r} lens={lens} member={member} labels={labels} />
          ))}
          {!member && (locked.length > 0 || hiddenOffers) && <SignupGate lockedCount={locked.length} query={queryFor(list, view)} />}
          {locked.length > 0 && (
            <div className="mt-6 flex flex-col gap-3">
              {locked.map((r) => (
                <LockedLine key={`${r.line.term}-${r.line.quantity}`} result={r} />
              ))}
            </div>
          )}
        </>
      )}

      <p className="mt-8 max-w-190 text-[13px] leading-relaxed text-mute">
        Lead time is the supplier&apos;s own, before freight and clearing. Prices are supplier prices, not landed cost.
        Import permits and duty depend on the product and are confirmed after you choose a supplier. Landed-cost figures
        are estimates, not official customs assessments.
      </p>
    </div>
  );
}
