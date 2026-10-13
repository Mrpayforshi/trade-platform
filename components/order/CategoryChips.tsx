import Link from "next/link";
import type { OfferProduct } from "@/lib/order/match";

/** Starter chips built from categories that actually have published products. */
export function CategoryChips({ offers, basePath }: { offers: OfferProduct[]; basePath: string }) {
  const seen = new Map<string, string>();
  for (const o of offers) if (o.category && !seen.has(o.category.slug)) seen.set(o.category.slug, o.category.name);
  const chips = [...seen.values()].slice(0, 8);
  if (chips.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="text-sm text-mute">Or start with</span>
      {chips.map((name) => (
        <Link
          key={name}
          href={`${basePath}?list=${encodeURIComponent(name)}`}
          className="rounded-full border border-line bg-card px-3 py-1 text-sm font-medium text-ink hover:border-brand hover:text-brand"
        >
          {name}
        </Link>
      ))}
    </div>
  );
}
