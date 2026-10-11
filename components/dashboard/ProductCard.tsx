import Link from "next/link";
import { formatUsdPrecise, warrantyLabel } from "@/lib/dashboard/journey";
import type { ProductRow } from "@/lib/dashboard/queries";
import { ProductVisual } from "./ProductVisual";
import { RequestQuoteButton } from "./RequestQuoteButton";
import { Pill } from "./ui";

const tint = ["bg-line/50", "bg-brand/10", "bg-amber/15"];

export function ProductCard({ product: p, compact = false, index = 0 }: { product: ProductRow; compact?: boolean; index?: number }) {
  const supplier = p.suppliers;
  const warranty = warrantyLabel(p.warranty_months);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-card">
      <div
        className={`relative flex items-center justify-center overflow-hidden [background-image:radial-gradient(var(--line)_1px,transparent_1px)] [background-size:14px_14px] ${compact ? "h-36" : "h-48"} ${tint[index % tint.length]}`}
      >
        <ProductVisual name={p.name} slug={p.categories?.slug} imageUrl={p.image_url} />
        <span className="absolute left-3 top-3 rounded-full border border-line bg-card px-2.5 py-0.5 text-[11.5px] font-semibold">
          Approved supplier
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mute">{p.categories?.name ?? "Product"}</p>
          <h3 className="mt-0.5 text-lg leading-snug">{p.name}</h3>
          {!compact && p.specification && <p className="mt-1 line-clamp-2 text-[13px] text-mute">{p.specification}</p>}
        </div>

        {supplier && (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-line/70 font-serif text-sm font-semibold">
              {supplier.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold">{supplier.name}</span>
              <span className="block text-xs text-mute">{supplier.country_of_origin ?? "China"}</span>
            </span>
            <span className="text-right leading-tight">
              <span className="block font-serif text-lg font-semibold">
                {supplier.performance_score == null ? "New" : Math.round(Number(supplier.performance_score))}
              </span>
              <span className="block text-[11px] text-mute">trust score</span>
            </span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <div>
            <p className="text-xs text-mute">Supplier price</p>
            <p>
              <span className="font-serif text-2xl font-semibold">{formatUsdPrecise(p.unit_price_usd)}</span>{" "}
              <span className="text-[13px] text-mute">/ {p.unit}</span>
            </p>
          </div>
          <p className="text-right text-xs font-semibold text-mute">
            Landed cost
            <span className="block text-[13px] text-ink">on request</span>
          </p>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            <Pill>MOQ {p.moq}</Pill>
            {p.lead_time_days != null && <Pill>{p.lead_time_days} day lead time</Pill>}
            {warranty && <Pill>{warranty}</Pill>}
          </div>
        )}

        {compact ? (
          <Link href="/dashboard/catalogue" className="rounded-md border border-ink px-4 py-2 text-center text-sm font-semibold">
            View in catalogue
          </Link>
        ) : (
          <RequestQuoteButton
            categoryId={p.category_id}
            productName={p.name}
            supplierName={supplier?.name ?? "the supplier"}
            moq={p.moq}
            unit={p.unit}
          />
        )}
      </div>
    </article>
  );
}
